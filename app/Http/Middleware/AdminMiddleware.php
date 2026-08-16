<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AdminMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        if (!$request->user() || !$request->user()->canAccessAdminPanel()) {
            return response()->json([
                'status' => 'error',
                'success' => false,
                'message' => 'Forbidden. Administrator access required.'
            ], 403);
        }

        return $next($request);
    }
}
