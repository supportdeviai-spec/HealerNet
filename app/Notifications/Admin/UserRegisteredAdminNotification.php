<?php

namespace App\Notifications\Admin;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class UserRegisteredAdminNotification extends Notification
{
    use Queueable;

    public function __construct(public User $registeredUser) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $name = $this->registeredUser->name;
        $email = $this->registeredUser->email;

        return [
            'type' => 'user_registered',
            'title' => 'New User Registration',
            'body' => "{$name} ({$email}) just registered on HealerNet.",
            'message' => "{$name} ({$email}) just registered on HealerNet.",
            'user_id' => $this->registeredUser->id,
            'user_name' => $name,
            'user_email' => $email,
            'link_section' => 'users',
        ];
    }
}
