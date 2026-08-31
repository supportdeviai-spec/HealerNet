<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('city_whatsapp_groups');
    }

    public function down(): void
    {
        Schema::create('city_whatsapp_groups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('city_id')->constrained()->cascadeOnDelete();
            $table->uuid('whatsapp_group_id');
            $table->foreign('whatsapp_group_id')->references('id')->on('whatsapp_groups')->cascadeOnDelete();
            $table->unsignedSmallInteger('display_order')->default(0);
            $table->string('status', 20)->default('active');
            $table->timestamps();
            $table->unique(['city_id', 'whatsapp_group_id']);
        });
    }
};
