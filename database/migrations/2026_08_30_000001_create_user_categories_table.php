<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('category_id')->constrained('categories')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['user_id', 'category_id']);
        });

        if (Schema::hasColumn('users', 'category_id')) {
            $users = DB::table('users')
                ->whereNotNull('category_id')
                ->select('id', 'category_id')
                ->get();

            $now = now();
            foreach ($users as $user) {
                DB::table('user_categories')->insertOrIgnore([
                    'user_id' => $user->id,
                    'category_id' => $user->category_id,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('user_categories');
    }
};
