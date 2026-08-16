<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('user_notifications');
    }

    public function down(): void
    {
        // Table removed in favor of native Laravel notifications table
    }
};
