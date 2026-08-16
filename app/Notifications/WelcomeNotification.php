<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class WelcomeNotification extends Notification
{
    use Queueable;

    protected string $name;

    public function __construct(string $name = 'Member')
    {
        $this->name = $name;
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'title' => 'Welcome to HealerNet Global Circle! 🌿',
            'body' => 'Your account is live. Explore holistic practitioner circles, research papers, and live workshops.',
            'type' => 'welcome',
            'unread' => true,
        ];
    }
}
