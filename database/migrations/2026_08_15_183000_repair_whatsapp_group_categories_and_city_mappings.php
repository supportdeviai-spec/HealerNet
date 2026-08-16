<?php

use App\Models\Category;
use App\Models\WhatsAppGroup;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Repair demo data so welcome-email assignment works:
     * - Sync whatsapp_groups.category_id from group name prefix
     * - Re-activate city mappings (one-per-city inactive broke multi-category cities)
     */
    public function up(): void
    {
        $categories = Category::query()->orderByDesc(DB::raw('LENGTH(name)'))->get(['id', 'name']);

        foreach ($categories as $category) {
            WhatsAppGroup::query()
                ->where('name', 'like', $category->name . '%')
                ->update(['category_id' => $category->id]);
        }

        DB::table('city_whatsapp_groups')
            ->where('status', 'inactive')
            ->update(['status' => 'active']);

        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
    }

    public function down(): void
    {
        // Data repair — not reversed.
    }
};
