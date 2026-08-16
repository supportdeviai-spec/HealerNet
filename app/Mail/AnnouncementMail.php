<?php

namespace App\Mail;

use App\Models\User;
use App\Services\AnnouncementEmailBuilder;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AnnouncementMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $user,
        public string $announcementSubject,
        public string $announcementBody,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->announcementSubject,
        );
    }

    public function content(): Content
    {
        return new Content(
            htmlString: AnnouncementEmailBuilder::build(
                $this->announcementSubject,
                $this->announcementBody,
                $this->user->name,
            ),
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
