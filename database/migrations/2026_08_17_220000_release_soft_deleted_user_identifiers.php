<?php

use App\Models\User;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        User::onlyTrashed()->each(function (User $user) {
            $user->releaseUniqueIdentifiers();
        });
    }

    public function down(): void
    {
        // Identifiers were anonymized to free unique email/mobile; cannot restore originals.
    }
};
