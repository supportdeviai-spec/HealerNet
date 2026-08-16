<?php

namespace App\Http\Controllers\Concerns;

use App\Support\PermissionCatalog;
use Illuminate\Http\JsonResponse;

trait AuthorizesPermissions
{
    protected function authorizePermission(string $permission): ?JsonResponse
    {
        $user = request()->user();

        if ($user?->isAdmin()) {
            return null;
        }

        if (!$user || !$user->hasPermissionTo($permission, PermissionCatalog::GUARD)) {
            return response()->json([
                'status' => 'error',
                'success' => false,
                'message' => 'Forbidden. You do not have permission to perform this action.',
            ], 403);
        }

        return null;
    }
}
