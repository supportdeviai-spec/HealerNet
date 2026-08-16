<?php

namespace App\Notifications\Admin;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class PasswordResetRequestedAdminNotification extends Notification
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
            'type' => 'password_reset_requested',
            'title' => 'Password Reset Requested',
            'body' => "{$name} ({$email}) requested a password reset link.",
            'message' => "{$name} ({$email}) requested a password reset link.",
            'user_id' => $this->user->id,
            'user_name' => $name,
            'user_email' => $email,
            'link_section' => 'users',
        ];
    }
}
