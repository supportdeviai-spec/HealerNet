<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('community_groups', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('category_id')->nullable()->constrained('categories')->nullOnDelete();
            $table->foreignId('city_id')->constrained('cities')->restrictOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('whatsapp_url')->nullable();
            $table->integer('display_order')->default(0);
            $table->integer('max_members')->default(250)->nullable();
            $table->integer('current_members')->default(0)->nullable();
            $table->enum('status', ['active', 'full', 'inactive'])->default('active');
            $table->timestamps();
            $table->softDeletes();
        });
    }
    public function down(): void { Schema::dropIfExists('community_groups'); }
};
