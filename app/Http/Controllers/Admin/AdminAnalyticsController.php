<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\AdminAnalyticsService;
use Illuminate\Http\JsonResponse;

class AdminAnalyticsController extends Controller
{
    public function __construct(
        private readonly AdminAnalyticsService $analytics
    ) {}

    public function index(): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'success' => true,
            'data' => $this->analytics->all(),
        ]);
    }
}
