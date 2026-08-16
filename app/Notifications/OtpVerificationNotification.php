<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class OtpVerificationNotification extends Notification
{
    use Queueable;

    protected string $code;

    public function __construct(string $code = '892104')
    {
        $this->code = $code;
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'title' => 'OTP Verification Code Delivered 🔑',
            'body' => "Your security code ($this->code) has been sent via SMS & Email. Valid for 10 minutes.",
            'type' => 'security',
            'unread' => true,
        ];
    }
}
