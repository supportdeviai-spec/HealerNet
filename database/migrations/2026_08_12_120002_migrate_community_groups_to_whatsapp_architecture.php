<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('community_groups')) {
            return;
        }

        Schema::table('community_members', function (Blueprint $table) {
            if (!Schema::hasColumn('community_members', 'whatsapp_group_id')) {
                $table->foreignUuid('whatsapp_group_id')
                    ->nullable()
                    ->after('community_group_id')
                    ->constrained('whatsapp_groups')
                    ->nullOnDelete();
            }
        });

        $legacyGroups = DB::table('community_groups')
            ->whereNull('deleted_at')
            ->orderBy('created_at')
            ->get();

        $masterIndex = [];

        foreach ($legacyGroups as $legacy) {
            $signature = md5(implode('|', [
                $legacy->name,
                $legacy->whatsapp_url ?? '',
                $legacy->category_id ?? '',
                $legacy->max_members ?? 250,
            ]));

            if (!isset($masterIndex[$signature])) {
                $whatsappGroupId = (string) Str::uuid();
                DB::table('whatsapp_groups')->insert([
                    'id' => $whatsappGroupId,
                    'category_id' => $legacy->category_id,
                    'name' => $legacy->name,
                    'description' => $legacy->description,
                    'whatsapp_url' => $legacy->whatsapp_url ?? '',
                    'max_members' => $legacy->max_members ?? 250,
                    'current_members' => $legacy->current_members ?? 0,
                    'status' => $legacy->status ?? 'active',
                    'created_at' => $legacy->created_at ?? now(),
                    'updated_at' => $legacy->updated_at ?? now(),
                ]);
                $masterIndex[$signature] = $whatsappGroupId;
            }

            $whatsappGroupId = $masterIndex[$signature];

            $exists = DB::table('city_whatsapp_groups')
                ->where('city_id', $legacy->city_id)
                ->where('whatsapp_group_id', $whatsappGroupId)
                ->exists();

            if (!$exists) {
                DB::table('city_whatsapp_groups')->insert([
                    'city_id' => $legacy->city_id,
                    'whatsapp_group_id' => $whatsappGroupId,
                    'display_order' => $legacy->display_order ?? 0,
                    'status' => in_array($legacy->status, ['inactive'], true) ? 'inactive' : 'active',
                    'created_at' => $legacy->created_at ?? now(),
                    'updated_at' => $legacy->updated_at ?? now(),
                ]);
            }

            DB::table('community_members')
                ->where('community_group_id', $legacy->id)
                ->update(['whatsapp_group_id' => $whatsappGroupId]);
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('community_members', 'whatsapp_group_id')) {
            Schema::table('community_members', function (Blueprint $table) {
                $table->dropConstrainedForeignId('whatsapp_group_id');
            });
        }
    }
};
