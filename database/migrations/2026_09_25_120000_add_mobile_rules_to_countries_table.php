<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('countries', function (Blueprint $table) {
            $table->unsignedTinyInteger('mobile_min_length')->nullable()->after('phone_code');
            $table->unsignedTinyInteger('mobile_max_length')->nullable()->after('mobile_min_length');
            $table->string('mobile_starts_with', 50)->nullable()->after('mobile_max_length');
        });
    }

    public function down(): void
    {
        Schema::table('countries', function (Blueprint $table) {
            $table->dropColumn(['mobile_min_length', 'mobile_max_length', 'mobile_starts_with']);
        });
    }
};
