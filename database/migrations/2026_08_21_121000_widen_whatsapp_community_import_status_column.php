<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('whatsapp_community_imports', function (Blueprint $table) {
            $table->string('status', 32)->default('completed')->change();
        });
    }

    public function down(): void
    {
        Schema::table('whatsapp_community_imports', function (Blueprint $table) {
            $table->string('status', 20)->default('completed')->change();
        });
    }
};
