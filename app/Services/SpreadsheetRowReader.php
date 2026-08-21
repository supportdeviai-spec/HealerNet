<?php

namespace App\Services;

use PhpOffice\PhpSpreadsheet\IOFactory;

class SpreadsheetRowReader
{
    /**
     * @return list<list<mixed>>
     */
    public function read(string $path): array
    {
        try {
            $reader = IOFactory::createReaderForFile($path);
            $reader->setReadDataOnly(true);
            $spreadsheet = $reader->load($path);
        } catch (\Throwable $e) {
            throw new \InvalidArgumentException('Unable to read the uploaded spreadsheet. Upload a valid Excel or CSV file.', 0, $e);
        }

        $sheet = $spreadsheet->getActiveSheet();
        $rows = $sheet->toArray(null, true, true, false);
        $spreadsheet->disconnectWorksheets();
        unset($spreadsheet);

        return array_values($rows);
    }
}
