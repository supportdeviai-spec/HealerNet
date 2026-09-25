<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('countries', function (Blueprint $table) {
            // What this country calls its region / city level, e.g. "Emirate" / "City / Area".
            $table->string('region_label', 50)->nullable()->after('mobile_starts_with');
            $table->string('city_label', 50)->nullable()->after('region_label');
        });
    }

    public function down(): void
    {
        Schema::table('countries', function (Blueprint $table) {
            $table->dropColumn(['region_label', 'city_label']);
        });
    }
};
