<?php

namespace App\Notifications\Admin;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class PasswordResetCompletedAdminNotification extends Notification
{
    use Queueable;

    public function __construct(public User $user) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $name = $this->user->name;
        $email = $this->user->email;

        return [
            'type' => 'password_reset_completed',
            'title' => 'Password Reset Completed',
            'body' => "{$name} ({$email}) successfully reset their password.",
            'message' => "{$name} ({$email}) successfully reset their password.",
            'user_id' => $this->user->id,
            'user_name' => $name,
            'user_email' => $email,
            'link_section' => 'users',
        ];
    }
}
