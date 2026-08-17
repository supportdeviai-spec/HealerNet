<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Throwable;

class HealthController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $database = true;

        try {
            DB::connection()->getPdo();
        } catch (Throwable) {
            $database = false;
        }

        return response()->json([
            'status' => $database ? 'ok' : 'degraded',
            'app' => config('app.name'),
            'time' => now()->toIso8601String(),
            'checks' => [
                'database' => $database,
            ],
        ], $database ? 200 : 503);
    }
}
