<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('community_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('community_group_id')->nullable()->constrained('community_groups')->nullOnDelete();
            $table->timestamp('joined_at')->useCurrent();
        });
    }

    public function down(): void {
        Schema::dropIfExists('community_members');
    }
};
