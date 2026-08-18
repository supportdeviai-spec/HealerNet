<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $this->replaceWelcomeEmailText('your city', 'your district');
    }

    public function down(): void
    {
        $this->replaceWelcomeEmailText('your district', 'your city');
    }

    private function replaceWelcomeEmailText(string $search, string $replace): void
    {
        $template = DB::table('email_templates')->where('slug', 'welcome-email')->first();
        if (!$template || !is_string($template->body)) {
            return;
        }

        $body = str_replace($search, $replace, $template->body);
        if ($body === $template->body) {
            return;
        }

        DB::table('email_templates')->where('id', $template->id)->update([
            'body' => $body,
            'updated_at' => now(),
        ]);
    }
};
