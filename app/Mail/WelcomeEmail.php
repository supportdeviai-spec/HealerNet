<?php

namespace App\Mail;

use App\Models\EmailTemplate;
use App\Models\User;
use App\Services\EmailService;
use App\Services\TemplateRendererService;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class WelcomeEmail extends Mailable
{
    use Queueable, SerializesModels;

    public User $user;

    public function __construct(User $user)
    {
        $this->user = $user;
    }

    public function envelope(): Envelope
    {
        $rendered = $this->renderTemplate();

        return new Envelope(
            subject: $rendered['subject'],
        );
    }

    public function content(): Content
    {
        $rendered = $this->renderTemplate();

        return new Content(
            htmlString: $rendered['html'],
        );
    }

    public function attachments(): array
    {
        return [];
    }

    /**
     * @return array{subject: string, html: string}
     */
    private function renderTemplate(): array
    {
        $emailService = app(EmailService::class);
        $renderer = app(TemplateRendererService::class);
        $variables = $emailService->buildWelcomeVariables($this->user);

        return $renderer->render(EmailTemplate::SLUG_WELCOME, $variables);
    }
}
