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

class ProcessWhatsAppCommunityImport implements ShouldQueue, ShouldBeUnique
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries;

    public int $timeout;

    public int $uniqueFor = 10800;

    public function __construct(public int $importId)
    {
        $this->tries = max(1, (int) config('whatsapp_import.job_tries', 1));
        $this->timeout = max(60, (int) config('whatsapp_import.job_timeout', 7200));
        WhatsAppCommunityImportService::configureImportQueue($this);
    }

    public function uniqueId(): string
    {
        return 'whatsapp-import-process:'.$this->importId;
    }

    public function handle(WhatsAppCommunityImportService $imports): void
    {
        $imports->runImport($this->importId);
    }

    public function failed(?Throwable $e): void
    {
        app(WhatsAppCommunityImportService::class)->failImport($this->importId, $e);
    }
}
