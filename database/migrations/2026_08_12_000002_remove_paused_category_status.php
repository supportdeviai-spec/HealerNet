<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('categories')->where('status', 'paused')->update(['status' => 'inactive']);

        DB::statement("ALTER TABLE categories MODIFY status ENUM('active', 'inactive') NOT NULL DEFAULT 'active'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE categories MODIFY status ENUM('active', 'paused', 'inactive') NOT NULL DEFAULT 'active'");
    }
};
