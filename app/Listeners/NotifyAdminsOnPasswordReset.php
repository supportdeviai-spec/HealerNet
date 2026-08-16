<?php

namespace App\Listeners;

use App\Notifications\Admin\PasswordResetCompletedAdminNotification;
use App\Services\AdminAlertService;
use Illuminate\Auth\Events\PasswordReset;

class NotifyAdminsOnPasswordReset
{
    public function handle(PasswordReset $event): void
    {
        if (!$event->user instanceof \App\Models\User) {
            return;
        }

        AdminAlertService::notifyAllAdmins(new PasswordResetCompletedAdminNotification($event->user));
    }
}
