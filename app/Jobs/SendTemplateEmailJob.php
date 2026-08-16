<?php

namespace App\Jobs;

use App\Services\MailDispatcherService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SendTemplateEmailJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public string $slug,
        public string $recipient,
        public array $variables = [],
    ) {}

    public function handle(MailDispatcherService $dispatcher): void
    {
        $dispatcher->sendTemplateNow($this->slug, $this->recipient, $this->variables);
    }
}
