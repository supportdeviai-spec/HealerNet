<?php

namespace App\Services;

use App\Models\Category;
use App\Models\WhatsAppCommunityImport;
use App\Models\WhatsAppGroup;
use App\Support\LocationNameNormalizer;
use App\Jobs\ProcessCategoryWhatsAppGroupImport;
use App\Services\ActivityLogger;
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

class CategoryWhatsAppGroupImportService
{
    public const CACHE_PREFIX = 'category-whatsapp-group-import:';

    public const CACHE_TTL_MINUTES = 30;

    public const MAX_ROWS = 1000000;

    public const CHUNK_SIZE = 500;

    public const MAX_FILE_KILOBYTES = 204800;

    /**
     * @var array<string, list<string>>
     */
    private const HEADER_ALIASES = [
        'category_name' => ['category name', 'category'],
        'group_name' => ['group name', 'whatsapp group name'],
        'whatsapp_link' => ['whatsapp link', 'whatsapp url', 'whatsapp group link', 'whatsapp group url', 'group link', 'group url'],
        'primary' => ['primary', 'is primary'],
        'status' => ['status'],
    ];

    /**
     * @var list<string>
     */
    private const REQUIRED_HEADERS = ['category_name', 'group_name', 'whatsapp_link', 'primary', 'status'];

    public function __construct(
        private readonly SpreadsheetRowReader $reader,
    ) {}

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

        try {
            $this->runPreview($token);
        } catch (Throwable) {
            // runPreview records failure details in preview cache.
        }

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
        ProcessCategoryWhatsAppGroupImport::dispatchSync($import->id);

        $import->refresh();

        return $this->formatImportPayload($import);
    }

    public function runPreview(string $token): void
    {
        $payload = $this->getPreviewCache($token);
        if (! is_array($payload) || empty($payload['file_path'])) {
            Log::error('Category WhatsApp group import preview cache miss', ['token' => $token]);
            throw new InvalidArgumentException('Import preview expired. Upload the file again.');
        }

        $this->putPreviewCache($token, [
            ...$payload,
            'status' => 'processing',
            'started_at' => now()->toIso8601String(),
        ]);

        $absolute = $this->absolutePath((string) $payload['file_path']);
        $state = $this->newEvaluationState();

        try {
            $this->collectWinnersFromFile($absolute, $state);
            $this->applyWinners($state, false);

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
        } catch (Throwable $e) {
            $this->failPreview($token, $e);
            throw $e;
        }
    }

    public function runImport(int $importId): void
    {
        $import = WhatsAppCommunityImport::query()->find($importId);

        if (! $import) {
            return;
        }

        if ($import->import_type !== WhatsAppCommunityImport::TYPE_CATEGORY_GROUPS) {
            $this->markImportFailed($import, 'This import record is not a category WhatsApp group import.');

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
            $this->collectWinnersFromFile($absolute, $state);
            $this->applyWinners($state, true);
            $this->persistImportProgress($import, $state, max($expectedTotal, (int) $state['summary']['total_rows']));

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
            Log::error('Category WhatsApp group import preview failed', [
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
            : 'Unable to read the uploaded file. Upload a valid Excel file.';

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
            Log::error('Category WhatsApp group import failed', [
                'import_id' => $importId,
                'error' => $e->getMessage(),
            ]);
        }

        $message = $e instanceof InvalidArgumentException
            ? $e->getMessage()
            : ($e
                ? 'Import failed: '.$e->getMessage()
                : 'Import failed. Some rows from earlier chunks may already have been saved. Check Import History and try a corrected file.');

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
            ->where('import_type', WhatsAppCommunityImport::TYPE_CATEGORY_GROUPS)
            ->with('user:id,name')
            ->orderByDesc('imported_at')
            ->orderByDesc('id')
            ->limit($limit)
            ->get();
    }

    public function paginateHistory(int $perPage = 15): LengthAwarePaginator
    {
        return WhatsAppCommunityImport::query()
            ->where('import_type', WhatsAppCommunityImport::TYPE_CATEGORY_GROUPS)
            ->with('user:id,name')
            ->orderByDesc('imported_at')
            ->orderByDesc('id')
            ->paginate($perPage);
    }

    public function deleteHistory(WhatsAppCommunityImport $import): void
    {
        if ($import->import_type !== WhatsAppCommunityImport::TYPE_CATEGORY_GROUPS) {
            throw new InvalidArgumentException('Invalid import history record.');
        }

        $this->deleteStoredFile($import->file_path);
        $import->delete();
    }

    public function templateDownload(): StreamedResponse
    {
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->fromArray([
            ['Category Name', 'Group Name', 'WhatsApp Link', 'Primary', 'Status'],
            ['Chronic Pain', 'Chronic Pain Cohort 1', 'https://chat.whatsapp.com/example1', 'No', 'Active'],
            ['Mental Wellness', 'Mental Wellness Cohort 1', 'https://chat.whatsapp.com/example2', 'Yes', 'Active'],
        ], null, 'A1');
        $sheet->getStyle('A1:E1')->getFont()->setBold(true);

        $writer = new Xlsx($spreadsheet);

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, 'HealerNet_Category_WhatsApp_Group_Import_Template.xlsx', [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     * @return array{summary: array<string, mixed>, issues: list<array<string, mixed>>}
     */
    public function evaluate(array $rows, bool $commit): array
    {
        $state = $this->newEvaluationState();

        foreach ($rows as $row) {
            $this->registerRowForWinner($row, $state);
        }

        $this->applyWinners($state, $commit);

        return [
            'summary' => $state['summary'],
            'issues' => $this->cappedIssues($state['issues']),
        ];
    }

    /**
     * @param  array<string, mixed>  $state
     */
    private function collectWinnersFromFile(string $absolutePath, array &$state): void
    {
        foreach ($this->mappedRowChunks($absolutePath) as $chunk) {
            foreach ($chunk as $row) {
                $this->registerRowForWinner($row, $state);
            }
        }
    }

    /**
     * @param  array<string, mixed>  $row
     * @param  array<string, mixed>  $state
     */
    private function registerRowForWinner(array $row, array &$state): void
    {
        $summary = &$state['summary'];
        $issues = &$state['issues'];
        $winners = &$state['winners'];

        $summary['total_rows']++;

        $parsed = $this->parseRow($row);
        $excelRow = (int) ($row['excel_row'] ?? 0);
        $issueBase = [
            'excel_row' => $excelRow,
            'category_name' => $parsed['category_display'],
            'group_name' => $parsed['group_display'],
        ];

        if ($parsed['error'] !== null) {
            $summary['errors']++;
            $issues[] = [...$issueBase, 'type' => 'error', 'reason' => $parsed['error']];

            return;
        }

        $identityKey = $parsed['identity_key'];
        if (isset($winners[$identityKey])) {
            $previous = $winners[$identityKey];
            $summary['skipped_duplicates']++;
            $issues[] = [
                'excel_row' => (int) ($previous['excel_row'] ?? 0),
                'category_name' => $parsed['category_display'],
                'group_name' => $parsed['group_display'],
                'type' => 'superseded',
                'reason' => 'Superseded by a later row in the file.',
            ];
        }

        $winners[$identityKey] = $parsed;
    }

    /**
     * @param  array<string, mixed>  $state
     */
    private function applyWinners(array &$state, bool $commit): void
    {
        foreach ($state['winners'] as $parsed) {
            $this->processWinner($parsed, $commit, $state);
        }
    }

    /**
     * @param  array<string, mixed>  $parsed
     * @param  array<string, mixed>  $state
     */
    private function processWinner(array $parsed, bool $commit, array &$state): void
    {
        $categoriesByKey = &$state['categories_by_key'];
        $groupsByKey = &$state['groups_by_key'];
        $summary = &$state['summary'];
        $issues = &$state['issues'];

        $excelRow = (int) ($parsed['excel_row'] ?? 0);
        $issueBase = [
            'excel_row' => $excelRow,
            'category_name' => $parsed['category_display'],
            'group_name' => $parsed['group_display'],
        ];

        $categoryKey = LocationNameNormalizer::name($parsed['category_display']);
        $matches = $categoriesByKey[$categoryKey] ?? [];

        if (count($matches) > 1) {
            $summary['errors']++;
            $issues[] = [...$issueBase, 'type' => 'error', 'reason' => "Category '{$parsed['category_display']}' is ambiguous."];

            return;
        }

        if (! $commit) {
            $category = $this->resolveCategoryForRow($parsed, false, $state);
            if ($category === null) {
                return;
            }
            $categoryId = (string) $category['id'];
            $groupKey = $categoryId.'|'.LocationNameNormalizer::name($parsed['group_display']);
            $existing = str_starts_with($categoryId, 'preview:')
                ? null
                : ($groupsByKey[$groupKey] ?? null);

            if ($existing !== null && ! $this->groupRowNeedsUpdate($existing, $parsed)) {
                $summary['skipped']++;

                return;
            }

            if ($existing === null) {
                $summary['imported']++;
            } else {
                $summary['updated']++;
            }

            return;
        }

        DB::transaction(function () use ($parsed, &$state, $issueBase) {
            $summary = &$state['summary'];
            $groupsByKey = &$state['groups_by_key'];

            $category = $this->resolveCategoryForRow($parsed, true, $state);
            if ($category === null) {
                $summary['errors']++;
                $state['issues'][] = [...$issueBase, 'type' => 'error', 'reason' => "Category '{$parsed['category_display']}' is ambiguous."];

                return;
            }

            $categoryId = (string) $category['id'];
            $groupKey = $categoryId.'|'.LocationNameNormalizer::name($parsed['group_display']);
            $existing = $groupsByKey[$groupKey] ?? null;

            if ($existing !== null && ! $this->groupRowNeedsUpdate($existing, $parsed)) {
                $summary['skipped']++;

                return;
            }

            WhatsAppGroup::query()
                ->where('category_id', $categoryId)
                ->lockForUpdate()
                ->get();

            $group = WhatsAppGroup::query()
                ->where('category_id', $categoryId)
                ->get()
                ->first(fn (WhatsAppGroup $candidate) => LocationNameNormalizer::name($candidate->name) === LocationNameNormalizer::name($parsed['group_display']));

            $isNew = $group === null;

            if ($isNew) {
                $group = WhatsAppGroup::create([
                    'category_id' => $categoryId,
                    'name' => $parsed['group_display'],
                    'whatsapp_url' => $parsed['whatsapp_url'],
                    'max_members' => WhatsAppGroup::MAX_MEMBERS,
                    'current_members' => 0,
                    'status' => $parsed['status'],
                    'is_primary' => false,
                ]);
                $summary['imported']++;
            } else {
                $existingSnapshot = [
                    'name' => $group->name,
                    'whatsapp_url' => $group->whatsapp_url,
                    'status' => $group->status,
                    'is_primary' => (bool) $group->is_primary,
                ];

                if (! $this->groupRowNeedsUpdate($existingSnapshot, $parsed)) {
                    $summary['skipped']++;

                    return;
                }

                $group->update([
                    'name' => $parsed['group_display'],
                    'whatsapp_url' => $parsed['whatsapp_url'],
                    'status' => $parsed['status'],
                ]);
                $summary['updated']++;
            }

            if ($parsed['is_primary']) {
                WhatsAppGroup::query()
                    ->where('category_id', $categoryId)
                    ->where('is_primary', true)
                    ->whereKeyNot($group->id)
                    ->update(['is_primary' => false]);
                $group->update(['is_primary' => true]);
            } elseif ($group->is_primary) {
                $group->update(['is_primary' => false]);
            }

            $group->refresh();

            $groupsByKey[$groupKey] = [
                'id' => $group->id,
                'category_id' => $categoryId,
                'name' => $group->name,
                'whatsapp_url' => $group->whatsapp_url,
                'status' => $group->status,
                'is_primary' => $group->is_primary,
            ];
        });
    }

    /**
     * @param  array<string, mixed>  $parsed
     * @param  array<string, mixed>  $state
     * @return array{id: string, name: string}|null
     */
    private function resolveCategoryForRow(array $parsed, bool $commit, array &$state): ?array
    {
        $categoriesByKey = &$state['categories_by_key'];
        $categoryCounted = &$state['category_counted'];
        $summary = &$state['summary'];
        $categoryKey = LocationNameNormalizer::name($parsed['category_display']);
        $matches = $categoriesByKey[$categoryKey] ?? [];

        if (count($matches) > 1) {
            return null;
        }

        if (count($matches) === 1) {
            if (! isset($categoryCounted[$categoryKey])) {
                $summary['categories']['existing']++;
                $categoryCounted[$categoryKey] = true;
            }

            return $matches[0];
        }

        if (! $commit) {
            if (! isset($categoryCounted[$categoryKey])) {
                $summary['categories']['new']++;
                $categoryCounted[$categoryKey] = true;
            }

            return [
                'id' => 'preview:'.$categoryKey,
                'name' => $parsed['category_display'],
            ];
        }

        $category = Category::create([
            'name' => $parsed['category_display'],
            'status' => 'active',
        ]);

        $record = [
            'id' => (string) $category->id,
            'name' => $category->name,
        ];
        $categoriesByKey[$categoryKey] = [$record];

        if (! isset($categoryCounted[$categoryKey])) {
            $summary['categories']['new']++;
            $categoryCounted[$categoryKey] = true;
        }

        return $record;
    }

    /**
     * @param  array<string, mixed>  $existing
     * @param  array<string, mixed>  $parsed
     */
    private function groupRowNeedsUpdate(array $existing, array $parsed): bool
    {
        if (LocationNameNormalizer::name($existing['name'] ?? '') !== LocationNameNormalizer::name($parsed['group_display'])) {
            return true;
        }

        if (LocationNameNormalizer::whatsappUrl($existing['whatsapp_url'] ?? '') !== LocationNameNormalizer::whatsappUrl($parsed['whatsapp_url'])) {
            return true;
        }

        if ((string) ($existing['status'] ?? '') !== (string) $parsed['status']) {
            return true;
        }

        return (bool) ($existing['is_primary'] ?? false) !== (bool) $parsed['is_primary'];
    }

    /**
     * @param  array<string, mixed>  $row
     * @return array{
     *   error: ?string,
     *   excel_row: int,
     *   category_display: string,
     *   group_display: string,
     *   whatsapp_url: string,
     *   is_primary: bool,
     *   status: string,
     *   identity_key: string
     * }
     */
    private function parseRow(array $row): array
    {
        $categoryDisplay = LocationNameNormalizer::display($row['category_name'] ?? '');
        $groupDisplay = LocationNameNormalizer::display($row['group_name'] ?? '');
        $linkInput = trim((string) ($row['whatsapp_link'] ?? ''));
        $primaryInput = trim((string) ($row['primary'] ?? ''));
        $statusInput = trim((string) ($row['status'] ?? ''));

        $base = [
            'error' => null,
            'excel_row' => (int) ($row['excel_row'] ?? 0),
            'category_display' => $categoryDisplay,
            'group_display' => $groupDisplay,
            'whatsapp_url' => $linkInput,
            'is_primary' => false,
            'status' => 'active',
            'identity_key' => '',
        ];

        if ($categoryDisplay === '') {
            $base['error'] = 'Missing Category Name.';

            return $base;
        }
        if ($groupDisplay === '') {
            $base['error'] = 'Missing Group Name.';

            return $base;
        }
        if ($linkInput === '') {
            $base['error'] = 'Missing WhatsApp Link.';

            return $base;
        }
        if (! WhatsAppGroupResolver::hasValidInviteLink($linkInput)) {
            $base['error'] = 'Invalid WhatsApp Link.';

            return $base;
        }

        if ($primaryInput === '') {
            $base['error'] = 'Missing Primary value.';

            return $base;
        }

        $primary = $this->parsePrimary($primaryInput);
        if ($primary === null) {
            $base['error'] = 'Invalid Primary value "'.$primaryInput.'".';

            return $base;
        }

        if ($statusInput === '') {
            $base['error'] = 'Missing Status.';

            return $base;
        }

        $status = $this->parseGroupStatus($statusInput);
        if ($status === null) {
            $base['error'] = 'Invalid Status "'.$statusInput.'".';

            return $base;
        }

        $base['whatsapp_url'] = $linkInput;
        $base['is_primary'] = $primary;
        $base['status'] = $status;
        $base['identity_key'] = LocationNameNormalizer::name($categoryDisplay).'|'.LocationNameNormalizer::name($groupDisplay);

        return $base;
    }

    private function parsePrimary(string $value): ?bool
    {
        $normalized = mb_strtolower(trim($value), 'UTF-8');

        return match ($normalized) {
            'yes' => true,
            'no' => false,
            default => null,
        };
    }

    private function parseGroupStatus(string $value): ?string
    {
        $normalized = mb_strtolower(trim($value), 'UTF-8');

        return match ($normalized) {
            'active' => 'active',
            'inactive' => 'inactive',
            default => null,
        };
    }

    /**
     * @return array<string, mixed>
     */
    private function newEvaluationState(): array
    {
        return [
            'categories_by_key' => $this->loadCategoriesByKey(),
            'groups_by_key' => $this->loadGroupsByKey(),
            'category_counted' => [],
            'winners' => [],
            'summary' => $this->emptySummary(),
            'issues' => [],
        ];
    }

    /**
     * @return array<string, list<array{id: string, name: string}>>
     */
    private function loadCategoriesByKey(): array
    {
        $map = [];
        foreach (Category::query()->get(['id', 'name']) as $category) {
            $key = LocationNameNormalizer::name($category->name);
            $map[$key][] = [
                'id' => (string) $category->id,
                'name' => $category->name,
            ];
        }

        return $map;
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    private function loadGroupsByKey(): array
    {
        $map = [];
        foreach (WhatsAppGroup::query()->get(['id', 'category_id', 'name', 'whatsapp_url', 'status', 'is_primary']) as $group) {
            if (! $group->category_id) {
                continue;
            }
            $key = $group->category_id.'|'.LocationNameNormalizer::name($group->name);
            $map[$key] = [
                'id' => $group->id,
                'category_id' => $group->category_id,
                'name' => $group->name,
                'whatsapp_url' => $group->whatsapp_url,
                'status' => $group->status,
                'is_primary' => (bool) $group->is_primary,
            ];
        }

        return $map;
    }

    /**
     * @return array<string, mixed>
     */
    private function emptySummary(): array
    {
        return [
            'total_rows' => 0,
            'categories' => ['new' => 0, 'existing' => 0],
            'imported' => 0,
            'updated' => 0,
            'skipped' => 0,
            'errors' => 0,
            'skipped_duplicates' => 0,
            'conflicts' => 0,
        ];
    }

    /**
     * @param  array{summary?: array<string, mixed>, issues?: list<array<string, mixed>>}  $result
     */
    private function newImportRecord(int $userId, string $fileName, string $status, array $result, ?string $filePath = null): WhatsAppCommunityImport
    {
        $summary = $result['summary'] ?? $this->emptySummary();
        $processed = (int) ($summary['total_rows'] ?? 0);
        $failed = (int) ($summary['errors'] ?? 0);
        $skipped = (int) ($summary['skipped'] ?? 0) + (int) ($summary['skipped_duplicates'] ?? 0);
        $success = max(0, (int) ($summary['imported'] ?? 0) + (int) ($summary['updated'] ?? 0) + (int) ($summary['skipped'] ?? 0));

        return WhatsAppCommunityImport::create([
            'user_id' => $userId,
            'file_name' => $fileName,
            'import_type' => WhatsAppCommunityImport::TYPE_CATEGORY_GROUPS,
            'file_path' => $filePath,
            'status' => $status,
            'total_rows' => $processed,
            'processed_rows' => $status === 'queued' ? 0 : $processed,
            'success_rows' => $status === 'queued' ? 0 : $success,
            'failed_rows' => $status === 'queued' ? 0 : $failed,
            'progress' => $status === 'queued' ? 0 : 100,
            'created_count' => (int) ($summary['imported'] ?? 0) + (int) ($summary['categories']['new'] ?? 0),
            'updated_count' => (int) ($summary['updated'] ?? 0),
            'skipped_count' => $skipped,
            'error_count' => $failed,
            'conflict_count' => 0,
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
        $skipped = (int) ($summary['skipped'] ?? 0) + (int) ($summary['skipped_duplicates'] ?? 0);
        $success = max(0, (int) ($summary['imported'] ?? 0) + (int) ($summary['updated'] ?? 0) + (int) ($summary['skipped'] ?? 0));
        $total = max($expectedTotal, $processed, 1);

        $import->update([
            'status' => 'processing',
            'processed_rows' => $processed,
            'success_rows' => $success,
            'failed_rows' => $failed,
            'progress' => min(99, (int) round($processed / $total * 100)),
            'total_rows' => max((int) $import->total_rows, $processed),
            'created_count' => (int) ($summary['imported'] ?? 0) + (int) ($summary['categories']['new'] ?? 0),
            'updated_count' => (int) ($summary['updated'] ?? 0),
            'skipped_count' => $skipped,
            'error_count' => $failed,
            'conflict_count' => 0,
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
        $skipped = (int) ($summary['skipped'] ?? 0) + (int) ($summary['skipped_duplicates'] ?? 0);
        $success = max(0, (int) ($summary['imported'] ?? 0) + (int) ($summary['updated'] ?? 0) + (int) ($summary['skipped'] ?? 0));
        $status = $failed > 0 ? 'completed_with_errors' : 'completed';

        $filePath = $import->file_path;
        $import->update([
            'status' => $status,
            'file_path' => null,
            'total_rows' => $processed,
            'processed_rows' => $processed,
            'success_rows' => $success,
            'failed_rows' => $failed,
            'progress' => 100,
            'created_count' => (int) ($summary['imported'] ?? 0) + (int) ($summary['categories']['new'] ?? 0),
            'updated_count' => (int) ($summary['updated'] ?? 0),
            'skipped_count' => $skipped,
            'error_count' => $failed,
            'conflict_count' => 0,
            'summary' => $summary,
            'issues' => $this->cappedIssues($result['issues'] ?? []),
            'imported_at' => now(),
            'completed_at' => now(),
            'error_message' => null,
        ]);

        $this->deleteStoredFile($filePath);

        if ($import->user_id) {
            try {
                ActivityLogger::log(
                    (int) $import->user_id,
                    'category_group_import',
                    sprintf(
                        'Imported %s: %d rows, created groups=%d, updated groups=%d, skipped=%d, errors=%d',
                        $import->file_name,
                        $processed,
                        $summary['imported'] ?? 0,
                        $summary['updated'] ?? 0,
                        $skipped,
                        $failed
                    )
                );
            } catch (Throwable $e) {
                report($e);
            }
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
        if (! in_array($extension, ['xlsx', 'xls'], true)) {
            throw new InvalidArgumentException('Upload a valid Excel file (.xlsx or .xls).');
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
                        throw new InvalidArgumentException('Required headers were not found. Expected: Category Name, Group Name, WhatsApp Link, Primary, Status.');
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
            throw new InvalidArgumentException('Required headers were not found. Expected: Category Name, Group Name, WhatsApp Link, Primary, Status.');
        }
        if ($buffer !== []) {
            yield $buffer;
        }
    }

    private function safeFileName(?string $name): string
    {
        $base = basename((string) $name);
        $clean = preg_replace('/[^\w.\- ()\[\]]+/u', '_', $base) ?: 'import.xlsx';

        return Str::limit($clean, 180, '');
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

        $hasRequired = array_reduce(
            self::REQUIRED_HEADERS,
            fn (bool $carry, string $key) => $carry && array_key_exists($key, $map),
            true
        );

        return $hasRequired ? $map : [];
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
