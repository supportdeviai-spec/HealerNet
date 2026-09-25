<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Defaults for the countries created by LocationSeeder. Only empty (NULL) fields are
     * filled, so anything an admin already set via the panel or Excel import is kept.
     */
    private const DEFAULTS = [
        'IN' => ['region_label' => 'State', 'city_label' => 'District', 'mobile_min_length' => 10, 'mobile_max_length' => 10, 'mobile_starts_with' => '6,7,8,9'],
        'US' => ['region_label' => 'State', 'city_label' => 'City', 'mobile_min_length' => 10, 'mobile_max_length' => 10, 'mobile_starts_with' => null],
        'CA' => ['region_label' => 'Province', 'city_label' => 'City', 'mobile_min_length' => 10, 'mobile_max_length' => 10, 'mobile_starts_with' => null],
        'GB' => ['region_label' => 'Country', 'city_label' => 'City / Town', 'mobile_min_length' => 10, 'mobile_max_length' => 10, 'mobile_starts_with' => '7'],
    ];

    public function up(): void
    {
        foreach (self::DEFAULTS as $code => $values) {
            foreach ($values as $column => $value) {
                if ($value === null) {
                    continue;
                }
                DB::table('countries')
                    ->where('code', $code)
                    ->whereNull($column)
                    ->update([$column => $value, 'updated_at' => now()]);
            }
        }
    }

    public function down(): void
    {
        // Data-only defaults; nothing to undo safely (admins may have kept or edited them).
    }
};
