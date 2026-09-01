<?php

namespace App\Listeners;

use App\Events\UserRegistered;
use App\Services\EmailService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;

class SendWelcomeEmailListener implements ShouldQueue
{
    use InteractsWithQueue;

    protected EmailService $emailService;

    public function __construct(EmailService $emailService)
    {
        $this->emailService = $emailService;
    }

    public function handle(UserRegistered $event): void
    {
        $this->emailService->sendWelcomeEmail($event->user);
    }
}