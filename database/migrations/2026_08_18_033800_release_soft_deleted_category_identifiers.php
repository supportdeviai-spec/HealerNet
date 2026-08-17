<?php

use App\Models\Category;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        Category::onlyTrashed()->each(function (Category $category) {
            $category->releaseUniqueIdentifiers();
        });
    }

    public function down(): void
    {
        // Identifiers were anonymized to free unique name/slug; cannot restore originals.
    }
};
