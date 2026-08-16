<?php

namespace App\Http\Controllers;

use App\Models\Banner;
use App\Support\BannerPages;
use Illuminate\Http\JsonResponse;

class BannerController extends Controller
{
    /**
     * Get active banners for a specific page (login, registration, thanks, logo, etc.)
     */
    public function getForPage(string $page): JsonResponse
    {
        $normalizedPage = BannerPages::normalize($page);

        if (!$normalizedPage) {
            return response()->json([
                'status' => 'error',
                'message' => 'Invalid page parameter.',
                'allowed' => BannerPages::ALL,
            ], 400);
        }

        $banners = Banner::active()
            ->forPage($normalizedPage)
            ->ordered()
            ->get();

        return response()->json([
            'status' => 'success',
            'success' => true,
            'page' => $normalizedPage,
            'data' => $banners,
        ]);
    }
}
