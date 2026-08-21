<?php

namespace App\Services;

use App\Enums\Status;
use App\Jobs\PreviewWhatsAppCommunityImport;
use App\Jobs\ProcessWhatsAppCommunityImport;
use App\Models\City;
use App\Models\CityWhatsAppGroup;
use App\Models\Country;
use App\Models\Region;
use App\Models\WhatsAppCommunityImport;
use App\Models\WhatsAppGroup;
use App\Support\LocationNameNormalizer;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use InvalidArgumentException;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

class WhatsAppCommunityImportService
{
    public const CACHE_PREFIX = 'whatsapp-community-import:';

    public const CACHE_TTL_MINUTES = 30;

    public const MAX_ROWS = 1000000;

    public const CHUNK_SIZE = 500;

    public const MAX_FILE_KILOBYTES = 204800;

    public const WHATSAPP_LINK_PATTERN = '#^https://chat\.whatsapp\.com/.+#i';

    /**
     * @var array<string, list<string>>
     */
    private const HEADER_ALIASES = [
        'country' => ['country'],
        'state' => ['state', 'region'],
        'district' => ['district', 'city'],
        'group_name' => ['whatsapp group name', 'group name'],
        'group_link' => ['whatsapp group link', 'whatsapp group url', 'whatsapp link', 'whatsapp url', 'group link', 'group url'],
        'status' => ['status'],
        'description' => ['description'],
    ];

    /**
     * @var list<string>
     */
    private const REQUIRED_HEADERS = ['country', 'state', 'district', 'group_name', 'group_link'];

    public function __construct(private readonly SpreadsheetRowReader $reader) {}

    public static function configureImportQueue(object $job): void
    {
        $queue = (string) config('whatsapp_import.queue', 'whatsapp-imports');
        $job->onQueue($queue);

        if (config('queue.default') === 'redis' && ! app()->runningUnitTests()) {
            $job->onConnection('redis_imports');
        }
    }

    public function preview(UploadedFile $file, int $userId): array
    {
        $fileName = $this->safeFileName($file->getClientOriginalName());
        $token = (string) Str::uuid();
        $storedPath = $this->storeUpload($file, $token);

        $this->putPreviewCache($token, [
            'user_id' => $userId,
            'file_name' => $fileName,
            'file_path' => $storedPath,
            'status' => 'queued',
            'processed_rows' => 0,
            'total_rows' => 0,
            'progress' => 0,
            'error_message' => null,
            'result' => null,
        ]);

        PreviewWhatsAppCommunityImport::dispatch($token);

        return $this->formatPreviewPayload($token, $this->getPreviewCache($token) ?? []);
    }

    public function previewStatus(string $token, int $userId): array
    {
        $payload = $this->getPreviewCache($token);
        if (! is_array($payload) || (int) ($payload['user_id'] ?? 0) !== $userId) {
            throw new InvalidArgumentException('Import preview expired. Upload the file again.');
        }

        return $this->formatPreviewPayload($token, $payload);
    }

    public function confirm(string $token, int $userId): array
    {
        $payload = $this->getPreviewCache($token);
        if (! is_array($payload) || (int) ($payload['user_id'] ?? 0) !== $userId) {
            throw new InvalidArgumentException('Import preview expired. Upload the file again.');
        }

        $status = (string) ($payload['status'] ?? '');
        if ($status === 'failed') {
            throw new InvalidArgumentException($payload['error_message'] ?? 'Import preview failed. Upload the file again.');
        }
        if ($status !== 'ready') {
            throw new InvalidArgumentException('Import preview is still running. Wait for the preview to finish.');
        }

        $filePath = (string) ($payload['file_path'] ?? '');
        if ($filePath === '' || ! Storage::disk($this->disk())->exists($filePath)) {
            throw new InvalidArgumentException('Import preview expired. Upload the file again.');
        }

        $result = is_array($payload['result'] ?? null) ? $payload['result'] : [
            'summary' => $this->emptySummary(),
            'issues' => [],
        ];

        $import = $this->newImportRecord(
            $userId,
            (string) ($payload['file_name'] ?? 'spreadsheet'),
            'queued',
            $result,
            $filePath
        );

        Cache::forget(self::CACHE_PREFIX.$token);
        ProcessWhatsAppCommunityImport::dispatch($import->id);

        $import->refresh();

        return $this->formatImportPayload($import);
    }

    public function runPreview(string $token): void
    {
        $payload = $this->getPreviewCache($token);
        if (! is_array($payload) || empty($payload['file_path'])) {
            Log::error('WhatsApp community import preview cache miss', ['token' => $token]);
            throw new InvalidArgumentException('Import preview expired. Upload the file again.');
        }

        $this->putPreviewCache($token, [
            ...$payload,
            'status' => 'processing',
            'started_at' => now()->toIso8601String(),
        ]);

        $absolute = $this->absolutePath((string) $payload['file_path']);
        $state = $this->newEvaluationState();

        foreach ($this->mappedRowChunks($absolute) as $chunk) {
            $this->evaluateRows($chunk, false, $state);
            $this->putPreviewCache($token, [
                ...($this->getPreviewCache($token) ?: $payload),
                'status' => 'processing',
                'processed_rows' => $state['summary']['total_rows'],
                'total_rows' => $state['summary']['total_rows'],
                'progress' => 0,
                'result' => [
                    'summary' => $state['summary'],
                    'issues' => $this->cappedIssues($state['issues']),
                ],
            ]);
        }

        $total = (int) $state['summary']['total_rows'];
        $this->putPreviewCache($token, [
            ...($this->getPreviewCache($token) ?: $payload),
            'status' => 'ready',
            'processed_rows' => $total,
            'total_rows' => $total,
            'progress' => 100,
            'result' => [
                'summary' => $state['summary'],
                'issues' => $this->cappedIssues($state['issues']),
            ],
        ]);
    }

    public function runImport(int $importId): void
    {
        $import = WhatsAppCommunityImport::query()->find($importId);
        if (! $import) {
            return;
        }

        $filePath = (string) $import->file_path;
        if ($filePath === '' || ! Storage::disk($this->disk())->exists($filePath)) {
            $this->markImportFailed($import, 'The import file is no longer available. Upload the file again.');

            return;
        }

        $import->update([
            'status' => 'processing',
            'started_at' => $import->started_at ?? now(),
            'progress' => 0,
            'processed_rows' => 0,
            'error_message' => null,
        ]);

        $absolute = $this->absolutePath($filePath);
        $expectedTotal = max(0, (int) $import->total_rows);
        $state = $this->newEvaluationState();

        try {
            foreach ($this->mappedRowChunks($absolute) as $chunk) {
                DB::transaction(function () use ($chunk, &$state) {
                    $this->evaluateRows($chunk, true, $state);
                });

                $this->persistImportProgress($import, $state, $expectedTotal);
            }

            $final = [
                'summary' => $state['summary'],
                'issues' => $this->cappedIssues($state['issues']),
            ];
            $this->finalizeImport($import, $final);
        } catch (Throwable $e) {
            $this->failImport($importId, $e);
            throw $e;
        }
    }

    public function failPreview(string $token, ?Throwable $e = null): void
    {
        if ($e) {
            report($e);
            Log::error('WhatsApp community import preview failed', [
                'token' => $token,
                'error' => $e->getMessage(),
            ]);
        }

        $payload = $this->getPreviewCache($token);
        if (! is_array($payload)) {
            return;
        }

        $message = $e instanceof InvalidArgumentException
            ? $e->getMessage()
            : 'Unable to read the uploaded file. Upload a valid Excel or CSV file.';

        $this->putPreviewCache($token, [
            ...$payload,
            'status' => 'failed',
            'error_message' => $message,
            'progress' => 0,
        ]);
        $this->deleteStoredFile($payload['file_path'] ?? null);
    }

    public function failImport(int $importId, ?Throwable $e = null): void
    {
        if ($e) {
            report($e);
            Log::error('WhatsApp community import failed', [
                'import_id' => $importId,
                'error' => $e->getMessage(),
            ]);
        }

        $message = $e instanceof InvalidArgumentException
            ? $e->getMessage()
            : 'Import failed. Some rows from earlier chunks may already have been saved. Check Import History and try a corrected file.';

        $import = WhatsAppCommunityImport::query()->find($importId);
        if (! $import) {
            return;
        }

        $this->markImportFailed($import, $message);
    }

    public function importStatus(WhatsAppCommunityImport $import): array
    {
        return $this->formatImportPayload($import);
    }

    /**
     * @return Collection<int, WhatsAppCommunityImport>
     */
    public function history(int $limit = 5): Collection
    {
        return WhatsAppCommunityImport::query()
            ->with('user:id,name,email')
            ->orderByDesc('imported_at')
            ->orderByDesc('id')
            ->limit($limit)
            ->get();
    }

    public function paginateHistory(int $perPage = 15): LengthAwarePaginator
    {
        return WhatsAppCommunityImport::query()
            ->with('user:id,name,email')
            ->orderByDesc('imported_at')
            ->orderByDesc('id')
            ->paginate($perPage);
    }

    public function deleteHistory(WhatsAppCommunityImport $import): void
    {
        $this->deleteStoredFile($import->file_path);
        $import->delete();
    }

    public function pruneStalePreviewFiles(): void
    {
        $disk = Storage::disk($this->disk());
        $directory = $this->directory();
        if (! $disk->exists($directory)) {
            return;
        }

        $inUse = WhatsAppCommunityImport::query()
            ->whereIn('status', ['queued', 'processing'])
            ->whereNotNull('file_path')
            ->pluck('file_path')
            ->filter()
            ->all();

        $cutoff = now()->subHours(2)->timestamp;
        foreach ($disk->files($directory) as $file) {
            if (in_array($file, $inUse, true)) {
                continue;
            }
            if ($disk->lastModified($file) < $cutoff) {
                $disk->delete($file);
            }
        }
    }

    public function templateDownload(): StreamedResponse
    {
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->fromArray([
            ['Country', 'State', 'District', 'WhatsApp Group Name', 'WhatsApp Group Link', 'Status', 'Description'],
            ['India', 'Punjab', 'Mohali', 'Mohali Community', 'https://chat.whatsapp.com/ABC123', 'Active', 'Mohali district community'],
            ['India', 'Punjab', 'Patiala', 'Patiala Community', 'https://chat.whatsapp.com/DEF456', 'Active', 'Patiala district community'],
        ], null, 'A1');
        $sheet->getStyle('A1:G1')->getFont()->setBold(true);

        $writer = new Xlsx($spreadsheet);

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, 'HealerNet_WhatsApp_Community_Import_Template.xlsx', [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    /**
     * @param  array{summary: array<string, mixed>, issues: list<array<string, mixed>>}  $result
     */
    private function recordHistory(int $userId, string $fileName, string $status, array $result, ?string $filePath = null): WhatsAppCommunityImport
    {
        return $this->newImportRecord($userId, $fileName, $status, $result, $filePath);
    }

    /**
     * @param  array{summary?: array<string, mixed>, issues?: list<array<string, mixed>>}  $result
     */
    private function newImportRecord(int $userId, string $fileName, string $status, array $result, ?string $filePath = null): WhatsAppCommunityImport
    {
        $summary = $result['summary'] ?? $this->emptySummary();

        $created = (int) ($summary['countries']['new'] ?? 0)
            + (int) ($summary['states']['new'] ?? 0)
            + (int) ($summary['districts']['new'] ?? 0)
            + (int) ($summary['whatsapp_groups']['new'] ?? 0);
        $updated = (int) ($summary['updated']['districts'] ?? 0)
            + (int) ($summary['updated']['whatsapp_groups'] ?? 0);
        $processed = (int) ($summary['total_rows'] ?? 0);
        $failed = (int) ($summary['errors'] ?? 0);
        $success = max(0, $processed - $failed - (int) ($summary['conflicts'] ?? 0) - (int) ($summary['skipped_duplicates'] ?? 0));

        return WhatsAppCommunityImport::create([
            'user_id' => $userId,
            'file_name' => $fileName,
            'file_path' => $filePath,
            'status' => $status,
            'total_rows' => $processed,
            'processed_rows' => $status === 'queued' ? 0 : $processed,
            'success_rows' => $status === 'queued' ? 0 : $success,
            'failed_rows' => $status === 'queued' ? 0 : $failed,
            'progress' => $status === 'queued' ? 0 : 100,
            'created_count' => $created,
            'updated_count' => $updated,
            'skipped_count' => (int) ($summary['skipped_duplicates'] ?? 0),
            'error_count' => $failed,
            'conflict_count' => (int) ($summary['conflicts'] ?? 0),
            'summary' => $summary,
            'issues' => $this->cappedIssues($result['issues'] ?? []),
            'imported_at' => in_array($status, ['completed', 'completed_with_errors', 'failed'], true) ? now() : null,
        ]);
    }

    /**
     * @param  array<string, mixed>  $state
     */
    private function persistImportProgress(WhatsAppCommunityImport $import, array $state, int $expectedTotal): void
    {
        $summary = $state['summary'];
        $processed = (int) ($summary['total_rows'] ?? 0);
        $failed = (int) ($summary['errors'] ?? 0);
        $conflicts = (int) ($summary['conflicts'] ?? 0);
        $skipped = (int) ($summary['skipped_duplicates'] ?? 0);
        $success = max(0, $processed - $failed - $conflicts - $skipped);
        $total = max($expectedTotal, $processed, 1);
        $created = (int) ($summary['countries']['new'] ?? 0)
            + (int) ($summary['states']['new'] ?? 0)
            + (int) ($summary['districts']['new'] ?? 0)
            + (int) ($summary['whatsapp_groups']['new'] ?? 0);
        $updated = (int) ($summary['updated']['districts'] ?? 0)
            + (int) ($summary['updated']['whatsapp_groups'] ?? 0);

        $import->update([
            'status' => 'processing',
            'processed_rows' => $processed,
            'success_rows' => $success,
            'failed_rows' => $failed,
            'progress' => min(99, (int) round($processed / $total * 100)),
            'total_rows' => max((int) $import->total_rows, $processed),
            'created_count' => $created,
            'updated_count' => $updated,
            'skipped_count' => $skipped,
            'error_count' => $failed,
            'conflict_count' => $conflicts,
            'summary' => $summary,
            'issues' => $this->cappedIssues($state['issues'] ?? []),
        ]);
    }

    /**
     * @param  array{summary: array<string, mixed>, issues: list<array<string, mixed>>}  $result
     */
    private function finalizeImport(WhatsAppCommunityImport $import, array $result): void
    {
        $summary = $result['summary'] ?? $this->emptySummary();
        $processed = (int) ($summary['total_rows'] ?? 0);
        $failed = (int) ($summary['errors'] ?? 0);
        $conflicts = (int) ($summary['conflicts'] ?? 0);
        $skipped = (int) ($summary['skipped_duplicates'] ?? 0);
        $success = max(0, $processed - $failed - $conflicts - $skipped);
        $created = (int) ($summary['countries']['new'] ?? 0)
            + (int) ($summary['states']['new'] ?? 0)
            + (int) ($summary['districts']['new'] ?? 0)
            + (int) ($summary['whatsapp_groups']['new'] ?? 0);
        $updated = (int) ($summary['updated']['districts'] ?? 0)
            + (int) ($summary['updated']['whatsapp_groups'] ?? 0);

        $status = ($failed > 0 || $conflicts > 0) ? 'completed_with_errors' : 'completed';

        $filePath = $import->file_path;
        $import->update([
            'status' => $status,
            'file_path' => null,
            'total_rows' => $processed,
            'processed_rows' => $processed,
            'success_rows' => $success,
            'failed_rows' => $failed,
            'progress' => 100,
            'created_count' => $created,
            'updated_count' => $updated,
            'skipped_count' => $skipped,
            'error_count' => $failed,
            'conflict_count' => $conflicts,
            'summary' => $summary,
            'issues' => $this->cappedIssues($result['issues'] ?? []),
            'imported_at' => now(),
            'completed_at' => now(),
            'error_message' => null,
        ]);

        $this->deleteStoredFile($filePath);
        app(LocationService::class)->clearLocationCache();

        if ($import->user_id) {
            ActivityLogger::log(
                (int) $import->user_id,
                'whatsapp_community_import',
                sprintf(
                    'Imported %s: %d rows, created countries=%d states=%d districts=%d groups=%d, updated districts=%d groups=%d, skipped=%d, errors=%d, conflicts=%d',
                    $import->file_name,
                    $processed,
                    $summary['countries']['new'] ?? 0,
                    $summary['states']['new'] ?? 0,
                    $summary['districts']['new'] ?? 0,
                    $summary['whatsapp_groups']['new'] ?? 0,
                    $summary['updated']['districts'] ?? 0,
                    $summary['updated']['whatsapp_groups'] ?? 0,
                    $skipped,
                    $failed,
                    $conflicts
                )
            );
        }
    }

    private function markImportFailed(WhatsAppCommunityImport $import, string $message): void
    {
        $this->deleteStoredFile($import->file_path);
        $import->update([
            'status' => 'failed',
            'file_path' => null,
            'error_message' => $message,
            'completed_at' => now(),
            'imported_at' => $import->imported_at ?? now(),
            'progress' => (int) $import->progress,
        ]);
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    private function formatPreviewPayload(string $token, array $payload): array
    {
        $result = is_array($payload['result'] ?? null) ? $payload['result'] : ['summary' => null, 'issues' => []];
        $data = [
            'import_token' => $token,
            'file_name' => $payload['file_name'] ?? null,
            'status' => $payload['status'] ?? 'queued',
            'processed_rows' => (int) ($payload['processed_rows'] ?? 0),
            'total_rows' => (int) ($payload['total_rows'] ?? 0),
            'progress' => (int) ($payload['progress'] ?? 0),
            'error_message' => $payload['error_message'] ?? null,
        ];

        if (isset($result['summary']) && is_array($result['summary'])) {
            $data['summary'] = $result['summary'];
            $data['issues'] = $result['issues'] ?? [];
        }

        return $data;
    }

    /**
     * @return array<string, mixed>
     */
    private function formatImportPayload(WhatsAppCommunityImport $import): array
    {
        $summary = is_array($import->summary) ? $import->summary : $this->emptySummary();
        $issues = is_array($import->issues) ? $import->issues : [];

        return [
            'file_name' => $import->file_name,
            'history_id' => $import->id,
            'status' => $import->status,
            'total_rows' => (int) $import->total_rows,
            'processed_rows' => (int) $import->processed_rows,
            'success_rows' => (int) $import->success_rows,
            'failed_rows' => (int) $import->failed_rows,
            'progress' => (int) $import->progress,
            'error_message' => $import->error_message,
            'started_at' => optional($import->started_at)?->toIso8601String(),
            'completed_at' => optional($import->completed_at)?->toIso8601String(),
            'summary' => $summary,
            'issues' => $issues,
        ];
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function putPreviewCache(string $token, array $payload): void
    {
        Cache::put(
            self::CACHE_PREFIX.$token,
            $payload,
            now()->addMinutes((int) config('whatsapp_import.preview_ttl_minutes', self::CACHE_TTL_MINUTES))
        );
    }

    /**
     * @return array<string, mixed>|null
     */
    private function getPreviewCache(string $token): ?array
    {
        $payload = Cache::get(self::CACHE_PREFIX.$token);

        return is_array($payload) ? $payload : null;
    }

    private function storeUpload(UploadedFile $file, string $token): string
    {
        $extension = strtolower($file->getClientOriginalExtension() ?: $file->extension() ?: 'xlsx');
        if (! in_array($extension, ['xlsx', 'xls', 'csv'], true)) {
            $extension = 'xlsx';
        }

        $path = $file->storeAs($this->directory(), $token.'.'.$extension, $this->disk());
        if (! is_string($path) || $path === '') {
            throw new InvalidArgumentException('Unable to store the uploaded file.');
        }

        return $path;
    }

    private function absolutePath(string $storedPath): string
    {
        return Storage::disk($this->disk())->path($storedPath);
    }

    private function deleteStoredFile(?string $path): void
    {
        if (! $path) {
            return;
        }

        $disk = Storage::disk($this->disk());
        if ($disk->exists($path)) {
            $disk->delete($path);
        }
    }

    private function disk(): string
    {
        return (string) config('whatsapp_import.disk', 'local');
    }

    private function directory(): string
    {
        return (string) config('whatsapp_import.directory', 'whatsapp-community-imports');
    }

    private function chunkSize(): int
    {
        return max(1, (int) config('whatsapp_import.chunk_size', self::CHUNK_SIZE));
    }

    private function maxRows(): int
    {
        return max(1, (int) config('whatsapp_import.max_rows', self::MAX_ROWS));
    }

    /**
     * @param  list<array<string, mixed>>  $issues
     * @return list<array<string, mixed>>
     */
    private function cappedIssues(array $issues): array
    {
        $max = max(1, (int) config('whatsapp_import.max_stored_issues', 2000));

        return array_slice($issues, 0, $max);
    }

    /**
     * @return \Generator<int, list<array<string, mixed>>>
     */
    private function mappedRowChunks(string $absolutePath): \Generator
    {
        $map = null;
        $buffer = [];
        $dataRows = 0;
        $excelRow = 0;
        $sawAnyRow = false;
        $chunkSize = $this->chunkSize();
        $maxRows = $this->maxRows();

        foreach ($this->reader->iterate($absolutePath) as $line) {
            $sawAnyRow = true;
            $excelRow++;

            if ($map === null) {
                $candidate = $this->mapHeaders($line);
                if ($candidate !== []) {
                    $map = $candidate;
                    $missing = array_values(array_filter(
                        self::REQUIRED_HEADERS,
                        fn (string $key) => ! array_key_exists($key, $map)
                    ));
                    if ($missing !== []) {
                        throw new InvalidArgumentException('Required headers were not found. Expected: Country, State, District, WhatsApp Group Name, WhatsApp Group Link.');
                    }
                }

                continue;
            }

            $row = [];
            foreach ($map as $key => $col) {
                $row[$key] = $this->cellString($line[$col] ?? null);
            }
            if ($this->rowIsEmpty($row)) {
                continue;
            }

            $row['excel_row'] = $excelRow;
            $buffer[] = $row;
            $dataRows++;

            if (count($buffer) >= $chunkSize) {
                yield $buffer;
                $buffer = [];
            }

            if ($dataRows >= $maxRows) {
                break;
            }
        }

        if (! $sawAnyRow) {
            throw new InvalidArgumentException('The spreadsheet is empty.');
        }
        if ($map === null) {
            throw new InvalidArgumentException('Required headers were not found. Expected: Country, State, District, WhatsApp Group Name, WhatsApp Group Link.');
        }
        if ($buffer !== []) {
            yield $buffer;
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function emptySummary(): array
    {
        return [
            'total_rows' => 0,
            'countries' => ['new' => 0, 'existing' => 0],
            'states' => ['new' => 0, 'existing' => 0],
            'districts' => ['new' => 0, 'existing' => 0],
            'whatsapp_groups' => ['new' => 0, 'existing' => 0],
            'updated' => ['districts' => 0, 'whatsapp_groups' => 0],
            'skipped_duplicates' => 0,
            'errors' => 0,
            'conflicts' => 0,
        ];
    }

    private function safeFileName(?string $name): string
    {
        $base = basename((string) $name);
        $clean = preg_replace('/[^\w.\- ()\[\]]+/u', '_', $base) ?: 'import.xlsx';

        return Str::limit($clean, 180, '');
    }

    /**
     * @return array{rows: list<array<string, string>>}
     */
    public function parseFile(UploadedFile $file): array
    {
        $path = $file->getRealPath();
        if (! $path) {
            throw new InvalidArgumentException('Unable to read the uploaded file.');
        }

        $rawRows = $this->reader->read($path);
        if ($rawRows === []) {
            throw new InvalidArgumentException('The spreadsheet is empty.');
        }

        $headerIndex = $this->findHeaderRow($rawRows);
        if ($headerIndex === null) {
            throw new InvalidArgumentException('Required headers were not found. Expected: Country, State, District, WhatsApp Group Name, WhatsApp Group Link.');
        }

        $map = $this->mapHeaders($rawRows[$headerIndex]);
        $missing = array_values(array_filter(
            self::REQUIRED_HEADERS,
            fn (string $key) => ! array_key_exists($key, $map)
        ));
        if ($missing !== []) {
            throw new InvalidArgumentException('Required headers were not found. Expected: Country, State, District, WhatsApp Group Name, WhatsApp Group Link.');
        }

        $rows = [];
        $dataStart = $headerIndex + 1;
        $limit = $dataStart + self::MAX_ROWS;
        for ($i = $dataStart; $i < count($rawRows) && $i < $limit; $i++) {
            $line = $rawRows[$i];
            $row = [];
            foreach ($map as $key => $col) {
                $row[$key] = $this->cellString($line[$col] ?? null);
            }
            if ($this->rowIsEmpty($row)) {
                continue;
            }
            $row['excel_row'] = $i + 1;
            $rows[] = $row;
        }

        return ['rows' => $rows];
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     * @return array{summary: array<string, mixed>, issues: list<array<string, mixed>>}
     */
    public function evaluate(array $rows, bool $commit): array
    {
        $state = $this->newEvaluationState();
        $this->evaluateRows($rows, $commit, $state);

        return [
            'summary' => $state['summary'],
            'issues' => $this->cappedIssues($state['issues']),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function newEvaluationState(): array
    {
        $countries = $this->loadCountries();

        return [
            'countries' => $countries,
            'regions' => $this->loadRegions(),
            'cities' => $this->loadCities(),
            'groups' => $this->loadGroups(),
            'usedCountryCodes' => $this->usedCountryCodes($countries),
            'seenExact' => [],
            'districtLink' => [],
            'countryCounted' => [],
            'stateCounted' => [],
            'districtCounted' => [],
            'groupCounted' => [],
            'summary' => $this->emptySummary(),
            'issues' => [],
        ];
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     * @param  array<string, mixed>  $state
     */
    private function evaluateRows(array $rows, bool $commit, array &$state): void
    {
        $countries = &$state['countries'];
        $regions = &$state['regions'];
        $cities = &$state['cities'];
        $groups = &$state['groups'];
        $usedCountryCodes = &$state['usedCountryCodes'];
        $seenExact = &$state['seenExact'];
        $districtLink = &$state['districtLink'];
        $summary = &$state['summary'];
        $issues = &$state['issues'];
        $countryCounted = &$state['countryCounted'];
        $stateCounted = &$state['stateCounted'];
        $districtCounted = &$state['districtCounted'];
        $groupCounted = &$state['groupCounted'];

        $summary['total_rows'] += count($rows);

        foreach ($rows as $row) {
            $excelRow = (int) $row['excel_row'];
            $countryDisplay = LocationNameNormalizer::display($row['country'] ?? '');
            $stateDisplay = LocationNameNormalizer::display($row['state'] ?? '');
            $districtDisplay = LocationNameNormalizer::display($row['district'] ?? '');
            $groupName = LocationNameNormalizer::display($row['group_name'] ?? '');
            $groupLink = trim((string) ($row['group_link'] ?? ''));
            $description = trim((string) ($row['description'] ?? ''));
            $statusInput = trim((string) ($row['status'] ?? ''));

            $issueBase = [
                'excel_row' => $excelRow,
                'country' => $countryDisplay,
                'state' => $stateDisplay,
                'district' => $districtDisplay,
                'group_name' => $groupName,
            ];

            $error = $this->validateRow($countryDisplay, $stateDisplay, $districtDisplay, $groupName, $groupLink, $statusInput);
            if ($error !== null) {
                $summary['errors']++;
                $issues[] = [...$issueBase, 'type' => 'error', 'reason' => $error];

                continue;
            }

            $groupStatus = $this->parseGroupStatus($statusInput);
            $countryKey = LocationNameNormalizer::name($countryDisplay);
            $stateKey = LocationNameNormalizer::name($stateDisplay);
            $districtKey = LocationNameNormalizer::name($districtDisplay);
            $linkKey = LocationNameNormalizer::whatsappUrl($groupLink);
            $locationKey = $countryKey.'|'.$stateKey.'|'.$districtKey;
            $exactKey = $locationKey.'|'.$linkKey;

            if (isset($seenExact[$exactKey])) {
                $summary['skipped_duplicates']++;
                $issues[] = [...$issueBase, 'type' => 'duplicate', 'reason' => 'Duplicate row skipped.'];

                continue;
            }

            if (isset($districtLink[$locationKey]) && $districtLink[$locationKey] !== $linkKey) {
                $summary['conflicts']++;
                $issues[] = [
                    ...$issueBase,
                    'type' => 'conflict',
                    'reason' => 'Multiple WhatsApp Groups found for the same District.',
                ];

                continue;
            }

            $countryRecord = $countries[$countryKey] ?? null;
            $regionRecord = $countryRecord
                ? ($regions[$countryRecord['id'].'|'.$stateKey] ?? null)
                : null;
            $cityRecord = $regionRecord
                ? ($cities[$regionRecord['id'].'|'.$districtKey] ?? null)
                : null;

            if ($cityRecord && $this->cityHasConflictingMappings($cityRecord, $linkKey, $groups)) {
                $summary['conflicts']++;
                $issues[] = [
                    ...$issueBase,
                    'type' => 'conflict',
                    'reason' => 'Multiple WhatsApp Groups found for the same District.',
                ];

                continue;
            }

            $seenExact[$exactKey] = true;
            $districtLink[$locationKey] = $linkKey;

            $countryIsNew = $countryRecord === null;
            if ($countryIsNew) {
                $countryRecord = $this->makeCountry($countryDisplay, $usedCountryCodes, $commit);
                $countries[$countryKey] = $countryRecord;
            }

            $stateMapKey = $countryRecord['id'].'|'.$stateKey;
            $stateIsNew = ! isset($regions[$stateMapKey]);
            if ($stateIsNew) {
                $regionRecord = $this->makeRegion($countryRecord['id'], $stateDisplay, $commit);
                $regions[$stateMapKey] = $regionRecord;
            } else {
                $regionRecord = $regions[$stateMapKey];
            }

            $districtMapKey = $regionRecord['id'].'|'.$districtKey;
            $districtIsNew = ! isset($cities[$districtMapKey]);
            if ($districtIsNew) {
                $cityRecord = $this->makeCity($regionRecord['id'], $districtDisplay, $commit);
                $cities[$districtMapKey] = $cityRecord;
            } else {
                $cityRecord = $cities[$districtMapKey];
            }

            $groupIsNew = ! isset($groups[$linkKey]);
            $groupUpdated = false;
            if ($groupIsNew) {
                $groupRecord = $this->makeGroup($groupName, $groupLink, $description, $groupStatus, $commit);
                $groups[$linkKey] = $groupRecord;
            } else {
                $groupRecord = $groups[$linkKey];
                $groupUpdated = $this->updateGroupIfNeeded($groupRecord, $groupName, $description, $groupStatus, $commit);
                $groups[$linkKey] = $groupRecord;
            }

            $mappingResult = $this->syncMapping($cityRecord, $groupRecord, $commit);
            $cities[$districtMapKey] = $cityRecord;

            if (! isset($countryCounted[$countryKey])) {
                $countryCounted[$countryKey] = true;
                $summary['countries'][$countryIsNew ? 'new' : 'existing']++;
            }
            if (! isset($stateCounted[$stateMapKey])) {
                $stateCounted[$stateMapKey] = true;
                $summary['states'][$stateIsNew ? 'new' : 'existing']++;
            }
            if (! isset($districtCounted[$districtMapKey])) {
                $districtCounted[$districtMapKey] = true;
                $summary['districts'][$districtIsNew ? 'new' : 'existing']++;
            }
            if (! isset($groupCounted[$linkKey])) {
                $groupCounted[$linkKey] = true;
                $summary['whatsapp_groups'][$groupIsNew ? 'new' : 'existing']++;
            }

            if ($groupUpdated) {
                $summary['updated']['whatsapp_groups']++;
            }
            if ($mappingResult === 'created' && ! $districtIsNew) {
                $summary['updated']['districts']++;
            } elseif ($mappingResult === 'replaced') {
                $summary['updated']['districts']++;
            }
        }
    }

    private function validateRow(
        string $country,
        string $state,
        string $district,
        string $groupName,
        string $groupLink,
        string $statusInput
    ): ?string {
        if ($country === '') {
            return 'Missing Country.';
        }
        if ($state === '') {
            return 'Missing State.';
        }
        if ($district === '') {
            return 'Missing District.';
        }
        if ($groupName === '') {
            return 'Missing Group Name.';
        }
        if ($groupLink === '') {
            return 'Missing Group Link.';
        }
        if (! preg_match(self::WHATSAPP_LINK_PATTERN, $groupLink)) {
            return 'Invalid WhatsApp Group URL.';
        }
        if ($statusInput !== '' && $this->parseGroupStatus($statusInput) === null) {
            return 'Invalid Status. Use Active, Inactive, or Full.';
        }

        return null;
    }

    private function parseGroupStatus(string $statusInput): ?string
    {
        if ($statusInput === '') {
            return null;
        }

        $normalized = mb_strtolower(trim($statusInput), 'UTF-8');

        return match ($normalized) {
            'active' => 'active',
            'inactive' => 'inactive',
            'full' => 'full',
            default => null,
        };
    }

    /**
     * @param  array<string, mixed>  $cityRecord
     * @param  array<string, array<string, mixed>>  $groups
     */
    private function cityHasConflictingMappings(array $cityRecord, string $incomingLinkKey, array $groups): bool
    {
        $mappings = $cityRecord['mappings'] ?? [];
        if (count($mappings) <= 1) {
            return false;
        }

        foreach ($mappings as $mapping) {
            $group = $groups[$mapping['link_key'] ?? ''] ?? null;
            if ($group && ($group['link_key'] ?? '') === $incomingLinkKey) {
                return false;
            }
        }

        return true;
    }

    /**
     * @param  array<string, mixed>  $cityRecord
     * @param  array<string, mixed>  $groupRecord
     */
    private function syncMapping(array &$cityRecord, array $groupRecord, bool $commit): string
    {
        $mappings = $cityRecord['mappings'] ?? [];
        foreach ($mappings as $mapping) {
            if (($mapping['whatsapp_group_id'] ?? null) === $groupRecord['id']) {
                return 'existing';
            }
        }

        if ($mappings === []) {
            $mapping = $this->makeMapping($cityRecord['id'], $groupRecord['id'], $groupRecord['link_key'], $commit);
            $cityRecord['mappings'][] = $mapping;

            return 'created';
        }

        if (count($mappings) === 1) {
            $existing = $mappings[0];
            if ($commit && isset($existing['id']) && is_int($existing['id'])) {
                CityWhatsAppGroup::query()->whereKey($existing['id'])->update([
                    'whatsapp_group_id' => $groupRecord['id'],
                    'status' => 'active',
                ]);
            }
            $cityRecord['mappings'][0] = [
                'id' => $existing['id'] ?? null,
                'whatsapp_group_id' => $groupRecord['id'],
                'link_key' => $groupRecord['link_key'],
            ];

            return 'replaced';
        }

        $mapping = $this->makeMapping($cityRecord['id'], $groupRecord['id'], $groupRecord['link_key'], $commit);
        $cityRecord['mappings'][] = $mapping;

        return 'created';
    }

    /**
     * @return array<string, mixed>
     */
    private function makeCountry(string $display, array &$usedCountryCodes, bool $commit): array
    {
        $code = $this->generateCountryCode($display, $usedCountryCodes);
        $usedCountryCodes[strtoupper($code)] = true;

        $id = $commit
            ? Country::create([
                'name' => $display,
                'code' => $code,
                'phone_code' => null,
                'status' => Status::ACTIVE,
            ])->id
            : 'new:country:'.$display;

        return [
            'id' => $id,
            'name' => $display,
            'code' => $code,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function makeRegion(int|string $countryId, string $display, bool $commit): array
    {
        $id = $commit
            ? Region::create([
                'country_id' => $countryId,
                'name' => $display,
                'code' => null,
                'type' => 'state',
                'status' => Status::ACTIVE,
            ])->id
            : 'new:region:'.$countryId.':'.$display;

        return [
            'id' => $id,
            'country_id' => $countryId,
            'name' => $display,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function makeCity(int|string $regionId, string $display, bool $commit): array
    {
        $id = $commit
            ? City::create([
                'region_id' => $regionId,
                'name' => $display,
                'status' => Status::ACTIVE,
            ])->id
            : 'new:city:'.$regionId.':'.$display;

        return [
            'id' => $id,
            'region_id' => $regionId,
            'name' => $display,
            'mappings' => [],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function makeGroup(string $name, string $link, string $description, ?string $status, bool $commit): array
    {
        $id = $commit
            ? WhatsAppGroup::create([
                'category_id' => null,
                'name' => $name,
                'description' => $description !== '' ? $description : null,
                'whatsapp_url' => $link,
                'max_members' => 250,
                'current_members' => 0,
                'status' => $status ?? 'active',
            ])->id
            : 'new:group:'.LocationNameNormalizer::whatsappUrl($link);

        return [
            'id' => $id,
            'name' => $name,
            'description' => $description !== '' ? $description : null,
            'whatsapp_url' => $link,
            'status' => $status ?? 'active',
            'link_key' => LocationNameNormalizer::whatsappUrl($link),
        ];
    }

    /**
     * @param  array<string, mixed>  $groupRecord
     */
    private function updateGroupIfNeeded(array &$groupRecord, string $name, string $description, ?string $status, bool $commit): bool
    {
        $changes = [];

        if ($name !== '' && $name !== ($groupRecord['name'] ?? null)) {
            $changes['name'] = $name;
            $groupRecord['name'] = $name;
        }

        if ($description !== '' && $description !== (string) ($groupRecord['description'] ?? '')) {
            $changes['description'] = $description;
            $groupRecord['description'] = $description;
        }

        if ($status !== null && $status !== ($groupRecord['status'] ?? null)) {
            $changes['status'] = $status;
            $groupRecord['status'] = $status;
        }

        if ($changes === []) {
            return false;
        }

        if ($commit && isset($groupRecord['id']) && ! str_starts_with((string) $groupRecord['id'], 'new:')) {
            WhatsAppGroup::query()->whereKey($groupRecord['id'])->update($changes);
        }

        return true;
    }

    /**
     * @return array<string, mixed>
     */
    private function makeMapping(int|string $cityId, int|string $groupId, string $linkKey, bool $commit): array
    {
        $id = null;
        if ($commit) {
            $id = CityWhatsAppGroup::create([
                'city_id' => $cityId,
                'whatsapp_group_id' => $groupId,
                'display_order' => 0,
                'status' => 'active',
            ])->id;
        }

        return [
            'id' => $id,
            'whatsapp_group_id' => $groupId,
            'link_key' => $linkKey,
        ];
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    private function loadCountries(): array
    {
        $map = [];
        foreach (Country::query()->get(['id', 'name', 'code']) as $country) {
            $map[LocationNameNormalizer::name($country->name)] = [
                'id' => $country->id,
                'name' => $country->name,
                'code' => $country->code,
            ];
        }

        return $map;
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    private function loadRegions(): array
    {
        $map = [];
        foreach (Region::query()->get(['id', 'country_id', 'name']) as $region) {
            $map[$region->country_id.'|'.LocationNameNormalizer::name($region->name)] = [
                'id' => $region->id,
                'country_id' => $region->country_id,
                'name' => $region->name,
            ];
        }

        return $map;
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    private function loadCities(): array
    {
        $groupsById = WhatsAppGroup::query()
            ->get(['id', 'whatsapp_url'])
            ->keyBy('id');

        $mappingsByCity = CityWhatsAppGroup::query()
            ->orderBy('display_order')
            ->orderBy('id')
            ->get(['id', 'city_id', 'whatsapp_group_id'])
            ->groupBy('city_id');

        $map = [];
        foreach (City::query()->get(['id', 'region_id', 'name', 'latitude', 'longitude', 'status']) as $city) {
            $mappings = [];
            foreach ($mappingsByCity->get($city->id, collect()) as $mapping) {
                $group = $groupsById->get($mapping->whatsapp_group_id);
                $mappings[] = [
                    'id' => $mapping->id,
                    'whatsapp_group_id' => $mapping->whatsapp_group_id,
                    'link_key' => $group ? LocationNameNormalizer::whatsappUrl($group->whatsapp_url) : '',
                ];
            }

            $map[$city->region_id.'|'.LocationNameNormalizer::name($city->name)] = [
                'id' => $city->id,
                'region_id' => $city->region_id,
                'name' => $city->name,
                'mappings' => $mappings,
            ];
        }

        return $map;
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    private function loadGroups(): array
    {
        $map = [];
        $groups = WhatsAppGroup::query()
            ->orderBy('created_at')
            ->orderBy('id')
            ->get(['id', 'name', 'description', 'whatsapp_url', 'status']);

        foreach ($groups as $group) {
            $key = LocationNameNormalizer::whatsappUrl($group->whatsapp_url);
            if ($key === '' || isset($map[$key])) {
                continue;
            }
            $map[$key] = [
                'id' => $group->id,
                'name' => $group->name,
                'description' => $group->description,
                'whatsapp_url' => $group->whatsapp_url,
                'status' => $group->status,
                'link_key' => $key,
            ];
        }

        return $map;
    }

    /**
     * @param  array<string, array<string, mixed>>  $countries
     * @return array<string, true>
     */
    private function usedCountryCodes(array $countries): array
    {
        $used = [];
        foreach ($countries as $country) {
            $code = strtoupper((string) ($country['code'] ?? ''));
            if ($code !== '') {
                $used[$code] = true;
            }
        }

        foreach (Country::query()->pluck('code') as $code) {
            $used[strtoupper((string) $code)] = true;
        }

        return $used;
    }

    /**
     * @param  array<string, true>  $used
     */
    private function generateCountryCode(string $name, array $used): string
    {
        $letters = strtoupper(preg_replace('/[^A-Za-z]/', '', $name) ?: 'XX');
        $base = substr($letters, 0, 2);
        if (strlen($base) < 2) {
            $base = str_pad($base, 2, 'X');
        }

        $code = $base;
        $n = 2;
        while (isset($used[strtoupper($code)])) {
            $suffix = (string) $n++;
            $code = substr($base, 0, max(1, 10 - strlen($suffix))).$suffix;
        }

        return $code;
    }

    /**
     * @param  list<list<mixed>>  $rows
     */
    private function findHeaderRow(array $rows): ?int
    {
        foreach ($rows as $index => $row) {
            if ($this->mapHeaders($row) !== []) {
                return $index;
            }
        }

        return null;
    }

    /**
     * @param  list<mixed>  $headerRow
     * @return array<string, int>
     */
    private function mapHeaders(array $headerRow): array
    {
        $normalized = [];
        foreach ($headerRow as $index => $value) {
            $label = LocationNameNormalizer::name($this->cellString($value));
            if ($label !== '') {
                $normalized[$index] = $label;
            }
        }

        $map = [];
        foreach (self::HEADER_ALIASES as $key => $aliases) {
            foreach ($aliases as $alias) {
                $found = array_search($alias, $normalized, true);
                if ($found !== false) {
                    $map[$key] = (int) $found;
                    break;
                }
            }
        }

        return $map;
    }

    /**
     * @param  array<string, string>  $row
     */
    private function rowIsEmpty(array $row): bool
    {
        foreach ($row as $value) {
            if (trim((string) $value) !== '') {
                return false;
            }
        }

        return true;
    }

    private function cellString(mixed $value): string
    {
        if ($value === null) {
            return '';
        }

        if (is_bool($value)) {
            return $value ? '1' : '0';
        }

        if (is_float($value) || is_int($value)) {
            if (is_float($value) && floor($value) === $value) {
                return (string) (int) $value;
            }

            return (string) $value;
        }

        return trim((string) $value);
    }
}
