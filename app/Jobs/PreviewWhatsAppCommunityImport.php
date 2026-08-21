<?php

namespace App\Jobs;

use App\Services\WhatsAppCommunityImportService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Throwable;

class PreviewWhatsAppCommunityImport implements ShouldQueue, ShouldBeUnique
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries;

    public int $timeout;

    public int $uniqueFor = 10800;

    public function __construct(public string $token)
    {
        $this->tries = max(1, (int) config('whatsapp_import.job_tries', 1));
        $this->timeout = max(60, (int) config('whatsapp_import.job_timeout', 7200));
        WhatsAppCommunityImportService::configureImportQueue($this);
    }

    public function uniqueId(): string
    {
        return 'whatsapp-import-preview:'.$this->token;
    }

    public function handle(WhatsAppCommunityImportService $imports): void
    {
        $imports->runPreview($this->token);
    }

    public function failed(?Throwable $e): void
    {
        app(WhatsAppCommunityImportService::class)->failPreview($this->token, $e);
    }
}
