<?php

namespace App\Services;

use App\Jobs\SendTemplateEmailJob;
use App\Models\EmailLog;
use App\Support\EmailLogo;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class MailDispatcherService
{
    protected ?string $lastError = null;

    public function __construct(
        protected TemplateRendererService $renderer
    ) {}

    public function getLastError(): ?string
    {
        return $this->lastError;
    }

    public function sendTemplate(
        string $slug,
        string $recipient,
        array $variables = [],
        bool $queue = false
    ): bool {
        if ($queue) {
            SendTemplateEmailJob::dispatch($slug, $recipient, $variables);

            return true;
        }

        return $this->sendTemplateNow($slug, $recipient, $variables);
    }

    public function sendTemplateNow(string $slug, string $recipient, array $variables = []): bool
    {
        $this->lastError = null;

        try {
            $rendered = $this->renderer->render($slug, $variables);

            return $this->sendRenderedNow($recipient, $rendered);
        } catch (\Throwable $exception) {
            return $this->fail($recipient, $slug, $exception);
        }
    }

    /**
     * @param array{subject: string, html: string, template_name?: string} $rendered
     */
    public function sendRenderedNow(string $recipient, array $rendered): bool
    {
        $this->lastError = null;

        try {
            Mail::html($rendered['html'], function ($message) use ($recipient, $rendered) {
                $message->to($recipient)->subject($rendered['subject']);
                EmailLogo::embedInto($message);
            });

            $this->logEmail($recipient, $rendered['subject'] ?? 'Email', 'sent');

            return true;
        } catch (\Throwable $exception) {
            $this->logEmail(
                $recipient,
                $rendered['subject'] ?? 'Email',
                'failed',
                $exception->getMessage()
            );

            return $this->fail($recipient, $rendered['subject'] ?? 'Email', $exception);
        }
    }

    private function fail(string $recipient, string $subject, \Throwable $exception): bool
    {
        $this->lastError = $exception->getMessage();
        Log::error("Email failed to {$recipient} [{$subject}]: " . $exception->getMessage());

        return false;
    }

    private function logEmail(string $recipient, string $subject, string $status, ?string $errorMessage = null): void
    {
        try {
            EmailLog::create([
                'recipient' => $recipient,
                'subject' => $subject,
                'status' => $status,
                'error_message' => $errorMessage,
                'sent_at' => $status === 'sent' ? now() : null,
            ]);
        } catch (\Throwable $exception) {
            Log::warning('Could not write email log: ' . $exception->getMessage());
        }
    }
}
