<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $this->replacePageText('and city during registration', 'and district during registration');
    }

    public function down(): void
    {
        $this->replacePageText('and district during registration', 'and city during registration');
    }

    private function replacePageText(string $search, string $replace): void
    {
        $page = DB::table('pages')->where('slug', 'privacy-policy')->first();
        if (!$page || !is_string($page->content)) {
            return;
        }

        $content = str_replace($search, $replace, $page->content);
        if ($content === $page->content) {
            return;
        }

        DB::table('pages')->where('id', $page->id)->update([
            'content' => $content,
            'updated_at' => now(),
        ]);
    }
};
