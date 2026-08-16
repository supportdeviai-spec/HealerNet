<?php

namespace App\Listeners;

use App\Events\UserRegistered;
use App\Notifications\Admin\UserRegisteredAdminNotification;
use App\Services\AdminAlertService;

class NotifyAdminsOnUserRegistered
{
    public function handle(UserRegistered $event): void
    {
        AdminAlertService::notifyAllAdmins(new UserRegisteredAdminNotification($event->user));
    }
}
