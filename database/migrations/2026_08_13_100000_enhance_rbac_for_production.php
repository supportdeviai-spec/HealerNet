<?php

use App\Support\PermissionCatalog;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('roles', function (Blueprint $table) {
            if (!Schema::hasColumn('roles', 'description')) {
                $table->text('description')->nullable()->after('slug');
            }
            if (!Schema::hasColumn('roles', 'status')) {
                $table->string('status', 20)->default('active')->after('description');
            }
        });

        $this->renameLegacyPermissionSlugs();
        $this->removeObsoletePermissions();
    }

    public function down(): void
    {
        Schema::table('roles', function (Blueprint $table) {
            if (Schema::hasColumn('roles', 'status')) {
                $table->dropColumn('status');
            }
            if (Schema::hasColumn('roles', 'description')) {
                $table->dropColumn('description');
            }
        });
    }

    private function renameLegacyPermissionSlugs(): void
    {
        $renames = [
            'users.update' => 'users.edit',
            'categories.update' => 'categories.edit',
            'communities.view' => 'whatsapp-groups.view',
            'communities.create' => 'whatsapp-groups.create',
            'communities.update' => 'whatsapp-groups.edit',
            'communities.delete' => 'whatsapp-groups.delete',
            'locations.view' => 'countries.view',
            'locations.create' => 'countries.create',
            'locations.update' => 'countries.edit',
            'locations.delete' => 'countries.delete',
            'banners.update' => 'banners.edit',
            'cms.update' => 'cms.edit',
            'email_templates.update' => 'email_templates.edit',
            'roles.update' => 'roles.edit',
            'settings.update' => 'settings.edit',
        ];

        foreach ($renames as $from => $to) {
            if (!Schema::hasTable('permissions')) {
                continue;
            }

            $exists = DB::table('permissions')->where('name', $from)->exists();
            $targetExists = DB::table('permissions')->where('name', $to)->exists();

            if ($exists && !$targetExists) {
                DB::table('permissions')
                    ->where('name', $from)
                    ->update([
                        'name' => $to,
                        'slug' => str_replace('.', '-', $to),
                    ]);
            } elseif ($exists && $targetExists) {
                $fromId = DB::table('permissions')->where('name', $from)->value('id');
                $toId = DB::table('permissions')->where('name', $to)->value('id');

                if ($fromId && $toId && Schema::hasTable('role_has_permissions')) {
                    DB::table('role_has_permissions')
                        ->where('permission_id', $fromId)
                        ->whereNotIn('role_id', function ($query) use ($toId) {
                            $query->select('role_id')
                                ->from('role_has_permissions')
                                ->where('permission_id', $toId);
                        })
                        ->update(['permission_id' => $toId]);

                    DB::table('role_has_permissions')->where('permission_id', $fromId)->delete();
                }

                DB::table('permissions')->where('id', $fromId)->delete();
            }
        }
    }

    private function removeObsoletePermissions(): void
    {
        if (!Schema::hasTable('permissions')) {
            return;
        }

        $valid = PermissionCatalog::allSlugs();

        DB::table('permissions')
            ->whereNotIn('name', $valid)
            ->orderBy('id')
            ->chunkById(50, function ($rows) {
                foreach ($rows as $row) {
                    if (Schema::hasTable('role_has_permissions')) {
                        DB::table('role_has_permissions')->where('permission_id', $row->id)->delete();
                    }
                    if (Schema::hasTable('model_has_permissions')) {
                        DB::table('model_has_permissions')->where('permission_id', $row->id)->delete();
                    }
                    DB::table('permissions')->where('id', $row->id)->delete();
                }
            });
    }
};
