<?php

namespace App\Observers;

use App\Models\Role;
use App\Models\User;

class UserRoleObserver
{
    public function saved(User $user): void
    {
        if (!$user->role_id || !$user->wasChanged('role_id')) {
            return;
        }

        $role = Role::find($user->role_id);
        if (!$role) {
            return;
        }

        $user->syncRoles([$role]);
    }
}
