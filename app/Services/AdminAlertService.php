<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Log;

class AdminAlertService
{
    public static function adminUsers(): Collection
    {
        return User::query()
            ->with('role')
            ->whereHas('role', fn ($query) => $query->where('slug', 'admin'))
            ->get();
    }

    public static function notifyAllAdmins(Notification $notification): void
    {
        $admins = self::adminUsers();

        if ($admins->isEmpty()) {
            Log::warning('AdminAlertService: no admin users found to notify.');
            return;
        }

        foreach ($admins as $admin) {
            $admin->notify($notification);
        }
    }
}
