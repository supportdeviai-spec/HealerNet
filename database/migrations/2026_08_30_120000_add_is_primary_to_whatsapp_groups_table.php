<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('whatsapp_groups', 'is_primary')) {
            Schema::table('whatsapp_groups', function (Blueprint $table) {
                $table->boolean('is_primary')->default(false)->after('status');
            });
        }

        if (!$this->indexExists('whatsapp_groups', 'whatsapp_groups_category_primary_idx')) {
            Schema::table('whatsapp_groups', function (Blueprint $table) {
                $table->index(['category_id', 'is_primary'], 'whatsapp_groups_category_primary_idx');
            });
        }
    }

    public function down(): void
    {
        if ($this->indexExists('whatsapp_groups', 'whatsapp_groups_category_primary_idx')) {
            Schema::table('whatsapp_groups', function (Blueprint $table) {
                $table->dropIndex('whatsapp_groups_category_primary_idx');
            });
        }

        if (Schema::hasColumn('whatsapp_groups', 'is_primary')) {
            Schema::table('whatsapp_groups', function (Blueprint $table) {
                $table->dropColumn('is_primary');
            });
        }
    }

    private function indexExists(string $table, string $index): bool
    {
        $connection = Schema::getConnection();
        $database = $connection->getDatabaseName();

        $result = $connection->select(
            'SELECT COUNT(*) AS aggregate FROM information_schema.statistics WHERE table_schema = ? AND table_name = ? AND index_name = ?',
            [$database, $table, $index]
        );

        return (int) ($result[0]->aggregate ?? 0) > 0;
    }
};
