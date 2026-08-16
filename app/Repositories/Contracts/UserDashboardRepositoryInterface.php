<?php

namespace App\Repositories\Contracts;

use App\Models\User;

interface UserDashboardRepositoryInterface
{
    public function getDashboardData(User $user): array;
    public function updateProfile(User $user, array $data): User;
    public function changePassword(User $user, string $newPassword): bool;
}