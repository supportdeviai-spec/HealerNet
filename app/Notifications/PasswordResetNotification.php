<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class PasswordResetNotification extends Notification
{
    use Queueable;

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'title' => 'Password Reset Security Alert 🛡️',
            'body' => 'Your account password was updated successfully. If this was not you, please contact support.',
            'type' => 'warning',
            'unread' => true,
        ];
    }
}
