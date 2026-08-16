<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('city_whatsapp_groups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('city_id')->constrained('cities')->cascadeOnDelete();
            $table->foreignUuid('whatsapp_group_id')->constrained('whatsapp_groups')->cascadeOnDelete();
            $table->unsignedInteger('display_order')->default(0);
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->timestamps();

            $table->unique(['city_id', 'whatsapp_group_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('city_whatsapp_groups');
    }
};
