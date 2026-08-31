<?php

use App\Models\WhatsAppGroup;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('whatsapp_groups', function (Blueprint $table) {
            $table->unsignedInteger('max_members')->default(WhatsAppGroup::MAX_MEMBERS)->change();
        });

        DB::table('whatsapp_groups')
            ->where('max_members', 250)
            ->update(['max_members' => WhatsAppGroup::MAX_MEMBERS]);

        if (Schema::hasTable('community_groups')) {
            Schema::table('community_groups', function (Blueprint $table) {
                $table->integer('max_members')->default(WhatsAppGroup::MAX_MEMBERS)->nullable()->change();
            });

            DB::table('community_groups')
                ->where('max_members', 250)
                ->update(['max_members' => WhatsAppGroup::MAX_MEMBERS]);
        }
    }

    public function down(): void
    {
        Schema::table('whatsapp_groups', function (Blueprint $table) {
            $table->unsignedInteger('max_members')->default(250)->change();
        });

        DB::table('whatsapp_groups')
            ->where('max_members', WhatsAppGroup::MAX_MEMBERS)
            ->update(['max_members' => 250]);

        if (Schema::hasTable('community_groups')) {
            Schema::table('community_groups', function (Blueprint $table) {
                $table->integer('max_members')->default(250)->nullable()->change();
            });

            DB::table('community_groups')
                ->where('max_members', WhatsAppGroup::MAX_MEMBERS)
                ->update(['max_members' => 250]);
        }
    }
};
