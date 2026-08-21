<?php

namespace App\Services;

use App\Enums\Status;
use App\Models\City;
use App\Models\CityWhatsAppGroup;
use App\Models\Country;
use App\Models\Region;
use App\Models\WhatsAppCommunityImport;
use App\Models\WhatsAppGroup;
use App\Support\LocationNameNormalizer;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
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

    public const MAX_ROWS = 10000;

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

    public function preview(UploadedFile $file, int $userId): array
    {
        $parsed = $this->parseFile($file);
        $result = $this->evaluate($parsed['rows'], commit: false);

        $fileName = $this->safeFileName($file->getClientOriginalName());
        $token = (string) Str::uuid();
        Cache::put(
            self::CACHE_PREFIX.$token,
            [
                'user_id' => $userId,
                'file_name' => $fileName,
                'rows' => $parsed['rows'],
            ],
            now()->addMinutes(self::CACHE_TTL_MINUTES)
        );

        return [
            'import_token' => $token,
            'file_name' => $fileName,
            ...$result,
        ];
    }

    public function confirm(string $token, int $userId): array
    {
        $payload = Cache::get(self::CACHE_PREFIX.$token);
        if (! is_array($payload) || (int) ($payload['user_id'] ?? 0) !== $userId) {
            throw new InvalidArgumentException('Import preview expired. Upload the file again.');
        }

        try {
            $result = DB::transaction(function () use ($payload) {
                return $this->evaluate($payload['rows'], commit: true);
            });
        } catch (Throwable $e) {
            $this->recordHistory($userId, $payload['file_name'] ?? 'spreadsheet', 'failed', [
                'summary' => $this->emptySummary(),
                'issues' => [[
                    'excel_row' => null,
                    'country' => '',
                    'state' => '',
                    'district' => '',
                    'group_name' => '',
                    'type' => 'error',
                    'reason' => 'Import failed before completion. No data was saved.',
                ]],
            ]);
            throw $e;
        }

        Cache::forget(self::CACHE_PREFIX.$token);
        app(LocationService::class)->clearLocationCache();

        $history = $this->recordHistory($userId, $payload['file_name'] ?? 'spreadsheet', 'completed', $result);

        ActivityLogger::log(
            $userId,
            'whatsapp_community_import',
            sprintf(
                'Imported %s: %d rows, created countries=%d states=%d districts=%d groups=%d, updated districts=%d groups=%d, skipped=%d, errors=%d, conflicts=%d',
                $payload['file_name'] ?? 'spreadsheet',
                $result['summary']['total_rows'],
                $result['summary']['countries']['new'],
                $result['summary']['states']['new'],
                $result['summary']['districts']['new'],
                $result['summary']['whatsapp_groups']['new'],
                $result['summary']['updated']['districts'],
                $result['summary']['updated']['whatsapp_groups'],
                $result['summary']['skipped_duplicates'],
                $result['summary']['errors'],
                $result['summary']['conflicts']
            )
        );

        return [
            'file_name' => $payload['file_name'] ?? null,
            'history_id' => $history->id,
            ...$result,
        ];
    }

    /**
     * @return Collection<int, WhatsAppCommunityImport>
     */
    public function history(int $limit = 20): Collection
    {
        return WhatsAppCommunityImport::query()
            ->with('user:id,name,email')
            ->orderByDesc('imported_at')
            ->orderByDesc('id')
            ->limit($limit)
            ->get();
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
    private function recordHistory(int $userId, string $fileName, string $status, array $result): WhatsAppCommunityImport
    {
        $summary = $result['summary'] ?? $this->emptySummary();

        $created = (int) ($summary['countries']['new'] ?? 0)
            + (int) ($summary['states']['new'] ?? 0)
            + (int) ($summary['districts']['new'] ?? 0)
            + (int) ($summary['whatsapp_groups']['new'] ?? 0);
        $updated = (int) ($summary['updated']['districts'] ?? 0)
            + (int) ($summary['updated']['whatsapp_groups'] ?? 0);

        return WhatsAppCommunityImport::create([
            'user_id' => $userId,
            'file_name' => $fileName,
            'status' => $status,
            'total_rows' => (int) ($summary['total_rows'] ?? 0),
            'created_count' => $created,
            'updated_count' => $updated,
            'skipped_count' => (int) ($summary['skipped_duplicates'] ?? 0),
            'error_count' => (int) ($summary['errors'] ?? 0),
            'conflict_count' => (int) ($summary['conflicts'] ?? 0),
            'summary' => $summary,
            'issues' => $result['issues'] ?? [],
            'imported_at' => now(),
        ]);
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
        $countries = $this->loadCountries();
        $regions = $this->loadRegions();
        $cities = $this->loadCities();
        $groups = $this->loadGroups();
        $usedCountryCodes = $this->usedCountryCodes($countries);

        $seenExact = [];
        $districtLink = [];

        $summary = [
            'total_rows' => count($rows),
            'countries' => ['new' => 0, 'existing' => 0],
            'states' => ['new' => 0, 'existing' => 0],
            'districts' => ['new' => 0, 'existing' => 0],
            'whatsapp_groups' => ['new' => 0, 'existing' => 0],
            'updated' => ['districts' => 0, 'whatsapp_groups' => 0],
            'skipped_duplicates' => 0,
            'errors' => 0,
            'conflicts' => 0,
        ];
        $issues = [];

        $countryCounted = [];
        $stateCounted = [];
        $districtCounted = [];
        $groupCounted = [];

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

        return ['summary' => $summary, 'issues' => $issues];
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
