<?php

namespace App\Http\Middleware;

use App\Support\PermissionCatalog;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePermission
{
    /**
     * @param  string  ...$permissions  One permission or pipe-separated list (any match grants access).
     */
    public function handle(Request $request, Closure $next, string ...$permissions): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'status' => 'error',
                'success' => false,
                'message' => 'Unauthenticated.',
            ], 401);
        }

        if ($user->isAdmin()) {
            return $next($request);
        }

        foreach ($permissions as $permission) {
            foreach (explode('|', $permission) as $slug) {
                $slug = trim($slug);
                if ($user->hasPermissionTo($slug, PermissionCatalog::GUARD)) {
                    return $next($request);
                }
            }
        }

        return response()->json([
            'status' => 'error',
            'success' => false,
            'message' => 'Forbidden. You do not have permission to perform this action.',
        ], 403);
    }
}
