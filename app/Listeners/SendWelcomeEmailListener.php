<?php

namespace App\Listeners;

use App\Events\UserRegistered;
use App\Models\User;
use App\Services\EmailService;
use Illuminate\Support\Facades\Log;

class SendWelcomeEmailListener
{
    public function __construct(
        protected EmailService $emailService
    ) {}

    public function handle(UserRegistered $event): void
    {
        $user = User::query()
            ->with(['country', 'region', 'city', 'category', 'categories', 'role', 'whatsappGroups'])
            ->find($event->user->id);

        if (!$user) {
            Log::warning('Welcome email skipped: user not found.', ['user_id' => $event->user->id]);

            return;
        }

        $this->emailService->sendWelcomeEmail($user);
    }
}
