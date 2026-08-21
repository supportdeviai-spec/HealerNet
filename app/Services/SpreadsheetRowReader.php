<?php

namespace App\Services;

use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Reader\IReadFilter;
use XMLReader;
use ZipArchive;

class SpreadsheetRowReader
{
    /**
     * @return list<list<mixed>>
     */
    public function read(string $path): array
    {
        $rows = [];
        foreach ($this->iterate($path) as $row) {
            $rows[] = $row;
        }

        return $rows;
    }

    /**
     * Yield rows incrementally. Does not build a full in-memory sheet.
     *
     * @return \Generator<int, list<mixed>>
     */
    public function iterate(string $path): \Generator
    {
        $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));

        if ($extension === 'csv' || $this->looksLikeCsv($path, $extension)) {
            yield from $this->iterateCsv($path);

            return;
        }

        if ($extension === 'xlsx' || $this->isZipSpreadsheet($path)) {
            yield from $this->iterateXlsx($path);

            return;
        }

        yield from $this->iterateWithPhpSpreadsheetChunks($path);
    }

    /**
     * @return \Generator<int, list<list<mixed>>>
     */
    public function chunks(string $path, int $chunkSize = 500): \Generator
    {
        $chunkSize = max(1, $chunkSize);
        $buffer = [];

        foreach ($this->iterate($path) as $row) {
            $buffer[] = $row;
            if (count($buffer) >= $chunkSize) {
                yield $buffer;
                $buffer = [];
            }
        }

        if ($buffer !== []) {
            yield $buffer;
        }
    }

    /**
     * @return \Generator<int, list<mixed>>
     */
    private function iterateCsv(string $path): \Generator
    {
        $handle = fopen($path, 'rb');
        if ($handle === false) {
            throw new \InvalidArgumentException('Unable to read the uploaded spreadsheet. Upload a valid Excel or CSV file.');
        }

        try {
            $bom = fread($handle, 3);
            if ($bom !== "\xEF\xBB\xBF") {
                rewind($handle);
            }

            while (($line = fgetcsv($handle)) !== false) {
                if ($line === [null] || $line === false) {
                    continue;
                }
                yield array_values($line);
            }
        } finally {
            fclose($handle);
        }
    }

    /**
     * Stream the first worksheet of an XLSX without loading the workbook into an array.
     *
     * @return \Generator<int, list<mixed>>
     */
    private function iterateXlsx(string $path): \Generator
    {
        $zip = new ZipArchive;
        if ($zip->open($path) !== true) {
            throw new \InvalidArgumentException('Unable to read the uploaded spreadsheet. Upload a valid Excel or CSV file.');
        }

        try {
            $sharedStrings = $this->readSharedStrings($path, $zip);
            $sheetZipPath = $this->firstWorksheetZipPath($zip);
            if ($sheetZipPath === null) {
                throw new \InvalidArgumentException('The spreadsheet is empty.');
            }
        } finally {
            $zip->close();
        }

        $sheetUri = $this->zipEntryUri($path, $sheetZipPath);
        $reader = new XMLReader;
        if (! @$reader->open($sheetUri, null, LIBXML_NONET | LIBXML_COMPACT)) {
            throw new \InvalidArgumentException('Unable to read the uploaded spreadsheet. Upload a valid Excel or CSV file.');
        }

        try {
            yield from $this->iterateSheetXml($reader, $sharedStrings);
        } finally {
            $reader->close();
        }
    }

    /**
     * @param  list<string>  $sharedStrings
     * @return \Generator<int, list<mixed>>
     */
    private function iterateSheetXml(XMLReader $reader, array $sharedStrings): \Generator
    {
        $currentRow = null;
        $currentCol = 0;
        $cellType = '';
        $cellRef = '';
        $inValue = false;
        $inInline = false;
        $value = '';

        while ($reader->read()) {
            if ($reader->nodeType === XMLReader::ELEMENT) {
                $name = $reader->localName;
                if ($name === 'row') {
                    $currentRow = [];
                    $currentCol = 0;
                    if ($reader->isEmptyElement) {
                        yield [];
                        $currentRow = null;
                    }
                } elseif ($name === 'c' && is_array($currentRow)) {
                    $cellRef = (string) $reader->getAttribute('r');
                    $cellType = (string) $reader->getAttribute('t');
                    $currentCol = $cellRef !== '' ? $this->columnIndexFromRef($cellRef) : count($currentRow);
                    $value = '';
                } elseif (($name === 'v' || $name === 't') && is_array($currentRow)) {
                    $inValue = true;
                    $value = '';
                    if ($name === 't' && $cellType === 'inlineStr') {
                        $inInline = true;
                    }
                } elseif ($name === 'is' && is_array($currentRow)) {
                    $inInline = true;
                    $value = '';
                }
            } elseif ($reader->nodeType === XMLReader::TEXT || $reader->nodeType === XMLReader::CDATA) {
                if ($inValue || $inInline) {
                    $value .= $reader->value;
                }
            } elseif ($reader->nodeType === XMLReader::END_ELEMENT) {
                $name = $reader->localName;
                if ($name === 'v' || ($name === 't' && ($inValue || $inInline))) {
                    $inValue = false;
                } elseif ($name === 'is') {
                    $inInline = false;
                } elseif ($name === 'c' && is_array($currentRow)) {
                    $resolved = $this->resolveCellValue($value, $cellType, $sharedStrings);
                    $currentRow[$currentCol] = $resolved;
                    $cellType = '';
                    $value = '';
                    $inValue = false;
                    $inInline = false;
                } elseif ($name === 'row') {
                    if (is_array($currentRow)) {
                        yield $this->normalizeRow($currentRow);
                    }
                    $currentRow = null;
                } elseif ($name === 'sheetData') {
                    if (is_array($currentRow)) {
                        yield $this->normalizeRow($currentRow);
                    }

                    return;
                }
            }
        }

        if (is_array($currentRow)) {
            yield $this->normalizeRow($currentRow);
        }
    }

    /**
     * @param  array<int, mixed>  $row
     * @return list<mixed>
     */
    private function normalizeRow(array $row): array
    {
        if ($row === []) {
            return [];
        }

        $max = max(array_keys($row));
        $out = [];
        for ($i = 0; $i <= $max; $i++) {
            $out[] = $row[$i] ?? '';
        }

        return $out;
    }

    /**
     * @param  list<string>  $sharedStrings
     */
    private function resolveCellValue(string $value, string $type, array $sharedStrings): mixed
    {
        $value = trim($value);

        return match ($type) {
            's' => $sharedStrings[(int) $value] ?? '',
            'b' => $value === '1' ? '1' : '0',
            'inlineStr', 'str' => $value,
            default => $value,
        };
    }

    /**
     * @return list<string>
     */
    private function readSharedStrings(string $path, ZipArchive $zip): array
    {
        $entry = null;
        for ($i = 0; $i < $zip->numFiles; $i++) {
            $name = $zip->getNameIndex($i);
            if (is_string($name) && str_ends_with(strtolower($name), 'sharedstrings.xml')) {
                $entry = $name;
                break;
            }
        }

        if ($entry === null) {
            return [];
        }

        $reader = new XMLReader;
        if (! @$reader->open($this->zipEntryUri($path, $entry), null, LIBXML_NONET | LIBXML_COMPACT)) {
            return [];
        }

        $strings = [];
        $inSi = false;
        $current = '';

        try {
            while ($reader->read()) {
                if ($reader->nodeType === XMLReader::ELEMENT && $reader->localName === 'si') {
                    $inSi = true;
                    $current = '';
                } elseif ($inSi && $reader->nodeType === XMLReader::ELEMENT && $reader->localName === 't') {
                    $text = $reader->readString();
                    $current .= $text;
                } elseif ($reader->nodeType === XMLReader::END_ELEMENT && $reader->localName === 'si') {
                    $strings[] = $current;
                    $inSi = false;
                    $current = '';
                }
            }
        } finally {
            $reader->close();
        }

        return $strings;
    }

    private function firstWorksheetZipPath(ZipArchive $zip): ?string
    {
        $workbook = $zip->getFromName('xl/workbook.xml');
        if (! is_string($workbook) || $workbook === '') {
            foreach (['xl/worksheets/sheet1.xml', 'xl/worksheets/sheet.xml'] as $fallback) {
                if ($zip->locateName($fallback) !== false) {
                    return $fallback;
                }
            }

            return null;
        }

        $rels = $zip->getFromName('xl/_rels/workbook.xml.rels') ?: '';
        $relTargets = [];
        if (is_string($rels) && $rels !== '') {
            $relXml = @simplexml_load_string($rels);
            if ($relXml) {
                foreach ($relXml->Relationship as $rel) {
                    $id = (string) $rel['Id'];
                    $target = (string) $rel['Target'];
                    if ($id !== '' && $target !== '') {
                        $relTargets[$id] = $target;
                    }
                }
            }
        }

        $xml = @simplexml_load_string($workbook);
        if ($xml) {
            $xml->registerXPathNamespace('m', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main');
            $xml->registerXPathNamespace('r', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships');
            $sheets = $xml->xpath('//m:sheets/m:sheet') ?: [];
            foreach ($sheets as $sheet) {
                $rId = (string) ($sheet->attributes('http://schemas.openxmlformats.org/officeDocument/2006/relationships')['id'] ?? '');
                $target = $relTargets[$rId] ?? null;
                if ($target) {
                    $target = ltrim(str_replace('\\', '/', $target), '/');
                    if (! str_starts_with($target, 'xl/')) {
                        $target = 'xl/'.$target;
                    }

                    return $target;
                }
            }
        }

        if ($zip->locateName('xl/worksheets/sheet1.xml') !== false) {
            return 'xl/worksheets/sheet1.xml';
        }

        return null;
    }

    private function zipEntryUri(string $path, string $entry): string
    {
        return 'zip://'.realpath($path).'#'.$entry;
    }

    private function columnIndexFromRef(string $cellRef): int
    {
        $letters = preg_replace('/[^A-Za-z]/', '', $cellRef) ?: '';
        $index = 0;
        $length = strlen($letters);
        for ($i = 0; $i < $length; $i++) {
            $index = $index * 26 + (ord(strtoupper($letters[$i])) - 64);
        }

        return max(0, $index - 1);
    }

    /**
     * Legacy .xls (BIFF) — load only a row window at a time.
     *
     * @return \Generator<int, list<mixed>>
     */
    private function iterateWithPhpSpreadsheetChunks(string $path): \Generator
    {
        try {
            $reader = IOFactory::createReaderForFile($path);
            $reader->setReadDataOnly(true);
            if (method_exists($reader, 'setReadEmptyCells')) {
                $reader->setReadEmptyCells(false);
            }

            $info = method_exists($reader, 'listWorksheetInfo') ? $reader->listWorksheetInfo($path) : [];
            $totalRows = (int) ($info[0]['totalRows'] ?? 0);
            if ($totalRows < 1) {
                $spreadsheet = $reader->load($path);
                $rows = $spreadsheet->getActiveSheet()->toArray(null, true, true, false);
                $spreadsheet->disconnectWorksheets();
                unset($spreadsheet);
                foreach (array_values($rows) as $row) {
                    yield array_values($row);
                }

                return;
            }

            $filter = new class implements IReadFilter
            {
                public int $startRow = 1;

                public int $endRow = 1;

                public function readCell(string $columnAddress, int $row, string $worksheetName = ''): bool
                {
                    return $row >= $this->startRow && $row <= $this->endRow;
                }
            };

            if (! method_exists($reader, 'setReadFilter')) {
                $spreadsheet = $reader->load($path);
                $rows = $spreadsheet->getActiveSheet()->toArray(null, true, true, false);
                $spreadsheet->disconnectWorksheets();
                unset($spreadsheet);
                foreach (array_values($rows) as $row) {
                    yield array_values($row);
                }

                return;
            }

            $chunkSize = 500;
            for ($start = 1; $start <= $totalRows; $start += $chunkSize) {
                $filter->startRow = $start;
                $filter->endRow = min($totalRows, $start + $chunkSize - 1);
                $reader->setReadFilter($filter);
                $spreadsheet = $reader->load($path);
                $rows = $spreadsheet->getActiveSheet()->toArray(null, true, true, false);
                $spreadsheet->disconnectWorksheets();
                unset($spreadsheet);

                foreach (array_values($rows) as $row) {
                    yield array_values($row);
                }
            }
        } catch (\InvalidArgumentException $e) {
            throw $e;
        } catch (\Throwable $e) {
            throw new \InvalidArgumentException('Unable to read the uploaded spreadsheet. Upload a valid Excel or CSV file.', 0, $e);
        }
    }

    private function looksLikeCsv(string $path, string $extension): bool
    {
        if ($extension === 'txt') {
            return true;
        }

        $fh = @fopen($path, 'rb');
        if ($fh === false) {
            return false;
        }
        $sample = fread($fh, 2048) ?: '';
        fclose($fh);

        return ! str_starts_with($sample, 'PK') && substr_count($sample, ',') >= 2;
    }

    private function isZipSpreadsheet(string $path): bool
    {
        $fh = @fopen($path, 'rb');
        if ($fh === false) {
            return false;
        }
        $magic = fread($fh, 4) ?: '';
        fclose($fh);

        return $magic === "PK\x03\x04";
    }
}
