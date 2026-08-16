<?php

use App\Models\Permission;
use App\Support\PermissionCatalog;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        // Relabel Community Groups → Group Management; drop unused create permission.
        Permission::query()
            ->where('guard_name', PermissionCatalog::GUARD)
            ->where('name', 'like', 'community-groups.%')
            ->update(['group' => 'group_management']);

        $create = Permission::query()
            ->where('guard_name', PermissionCatalog::GUARD)
            ->where('name', 'community-groups.create')
            ->first();

        if ($create) {
            $create->roles()->detach();
            $create->delete();
        }

        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
    }

    public function down(): void
    {
        Permission::query()
            ->where('guard_name', PermissionCatalog::GUARD)
            ->where('name', 'like', 'community-groups.%')
            ->update(['group' => 'community_groups']);

        Permission::query()->firstOrCreate(
            ['name' => 'community-groups.create', 'guard_name' => PermissionCatalog::GUARD],
            [
                'slug' => 'community-groups-create',
                'group' => 'community_groups',
            ]
        );

        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
    }
};
