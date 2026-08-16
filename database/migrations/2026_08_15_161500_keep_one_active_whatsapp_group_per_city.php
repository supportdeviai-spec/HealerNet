<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Keep one active WhatsApp community mapping per city (demo seed linked every cohort).
     */
    public function up(): void
    {
        $cityIds = DB::table('city_whatsapp_groups')
            ->select('city_id')
            ->groupBy('city_id')
            ->havingRaw('COUNT(*) > 1')
            ->pluck('city_id');

        foreach ($cityIds as $cityId) {
            $keepId = DB::table('city_whatsapp_groups')
                ->where('city_id', $cityId)
                ->orderBy('display_order')
                ->orderBy('id')
                ->value('id');

            if (!$keepId) {
                continue;
            }

            DB::table('city_whatsapp_groups')
                ->where('city_id', $cityId)
                ->where('id', '!=', $keepId)
                ->update(['status' => 'inactive']);

            DB::table('city_whatsapp_groups')
                ->where('id', $keepId)
                ->update(['status' => 'active', 'display_order' => 0]);
        }
    }

    public function down(): void
    {
        // Irreversible data cleanup.
    }
};
