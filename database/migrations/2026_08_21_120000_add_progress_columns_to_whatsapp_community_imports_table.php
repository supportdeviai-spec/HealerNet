<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('whatsapp_community_imports', function (Blueprint $table) {
            $table->string('file_path')->nullable()->after('file_name');
            $table->unsignedInteger('processed_rows')->default(0)->after('total_rows');
            $table->unsignedInteger('success_rows')->default(0)->after('processed_rows');
            $table->unsignedInteger('failed_rows')->default(0)->after('success_rows');
            $table->unsignedTinyInteger('progress')->default(0)->after('failed_rows');
            $table->timestamp('started_at')->nullable()->after('imported_at');
            $table->timestamp('completed_at')->nullable()->after('started_at');
            $table->text('error_message')->nullable()->after('completed_at');
        });
    }

    public function down(): void
    {
        Schema::table('whatsapp_community_imports', function (Blueprint $table) {
            $table->dropColumn([
                'file_path',
                'processed_rows',
                'success_rows',
                'failed_rows',
                'progress',
                'started_at',
                'completed_at',
                'error_message',
            ]);
        });
    }
};
