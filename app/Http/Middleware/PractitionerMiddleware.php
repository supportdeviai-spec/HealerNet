<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class PractitionerMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        if (!$request->user() || !$request->user()->isPractitioner()) {
            return response()->json([
                'status' => 'error',
                'success' => false,
                'message' => 'Forbidden. Practitioner verification required.'
            ], 403);
        }

        return $next($request);
    }
}
