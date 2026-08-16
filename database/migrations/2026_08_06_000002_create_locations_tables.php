<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('countries', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code', 10);
            $table->string('phone_code', 10)->nullable();
            $table->string('status', 20)->default('active');
            $table->timestamps();

            $table->unique('name');
            $table->unique('code');
            $table->index('status');
        });

        Schema::create('regions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('country_id')->constrained('countries')->restrictOnDelete();
            $table->string('name');
            $table->string('code', 20)->nullable();
            $table->string('type', 50)->default('state');
            $table->string('status', 20)->default('active');
            $table->timestamps();

            $table->unique(['country_id', 'name']);
            $table->index('status');
            $table->index(['country_id', 'status']);
        });

        Schema::create('cities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('region_id')->constrained('regions')->restrictOnDelete();
            $table->string('name');
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->string('status', 20)->default('active');
            $table->timestamps();

            $table->unique(['region_id', 'name']);
            $table->index('status');
            $table->index(['region_id', 'status']);
            $table->index(['latitude', 'longitude']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cities');
        Schema::dropIfExists('regions');
        Schema::dropIfExists('countries');
    }
};
