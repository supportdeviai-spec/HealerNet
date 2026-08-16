<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['country_id']);
            $table->dropForeign(['region_id']);
            $table->dropForeign(['city_id']);

            $table->foreign('country_id')
                ->references('id')
                ->on('countries')
                ->restrictOnDelete();

            $table->foreign('region_id')
                ->references('id')
                ->on('regions')
                ->restrictOnDelete();

            $table->foreign('city_id')
                ->references('id')
                ->on('cities')
                ->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['country_id']);
            $table->dropForeign(['region_id']);
            $table->dropForeign(['city_id']);

            $table->foreign('country_id')
                ->references('id')
                ->on('countries')
                ->nullOnDelete();

            $table->foreign('region_id')
                ->references('id')
                ->on('regions')
                ->nullOnDelete();

            $table->foreign('city_id')
                ->references('id')
                ->on('cities')
                ->nullOnDelete();
        });
    }
};
