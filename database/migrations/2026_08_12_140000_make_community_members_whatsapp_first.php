<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('community_members')) {
            return;
        }

        $indexes = collect(DB::select(
            "SELECT INDEX_NAME FROM information_schema.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'community_members'"
        ))->pluck('INDEX_NAME');

        if ($indexes->contains('community_members_user_id_community_group_id_unique')) {
            Schema::table('community_members', function (Blueprint $table) {
                $table->dropUnique(['user_id', 'community_group_id']);
            });
        }

        $column = collect(DB::select("SHOW COLUMNS FROM community_members WHERE Field = 'community_group_id'"))->first();
        if ($column && strtoupper((string) ($column->Null ?? '')) !== 'YES') {
            DB::statement('ALTER TABLE community_members MODIFY community_group_id CHAR(36) NULL');
        }

        if (Schema::hasColumn('community_members', 'whatsapp_group_id')
            && !$indexes->contains('community_members_user_whatsapp_unique')) {
            Schema::table('community_members', function (Blueprint $table) {
                $table->unique(['user_id', 'whatsapp_group_id'], 'community_members_user_whatsapp_unique');
            });
        }
    }

    public function down(): void
    {
        if (!Schema::hasTable('community_members')) {
            return;
        }

        Schema::table('community_members', function (Blueprint $table) {
            if (Schema::hasColumn('community_members', 'whatsapp_group_id')) {
                $table->dropUnique('community_members_user_whatsapp_unique');
            }
            $table->unique(['user_id', 'community_group_id']);
        });

        DB::statement('ALTER TABLE community_members MODIFY community_group_id CHAR(36) NOT NULL');
    }
};
