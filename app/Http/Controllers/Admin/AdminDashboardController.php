<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Category;
use App\Models\Country;
use App\Models\CityWhatsAppGroup;
use App\Models\WhatsAppGroup;
use App\Services\AdminAnalyticsService;
use Illuminate\Http\JsonResponse;

class AdminDashboardController extends Controller
{
    public function __construct(
        private readonly AdminAnalyticsService $analytics
    ) {}

    /**
     * Get platform-wide KPIs for the Admin Dashboard (Step 8)
     */
    public function index(): JsonResponse
    {
        $totalUsers = User::count();
        $verifiedUsers = User::whereNotNull('email_verified_at')
            ->orWhereNotNull('mobile_verified_at')
            ->where('is_verified', true)
            ->count();

        $metrics = [
            'total_users' => $totalUsers,
            'verification_rate' => $totalUsers > 0 ? (int) (($verifiedUsers / $totalUsers) * 100) : 0,

            'active_communities' => WhatsAppGroup::where('status', 'active')->count(),
            'full_communities' => WhatsAppGroup::where('status', 'full')->count(),
            // Match Group Management page total (all city↔group mappings)
            'community_count' => CityWhatsAppGroup::count(),
            'group_management_count' => CityWhatsAppGroup::count(),
            'total_countries' => Country::where('status', 'active')->count(),
            'total_categories' => Category::count(),

            'recent_users' => User::with(['role', 'category', 'country', 'state', 'city'])
                ->orderBy('created_at', 'desc')
                ->take(8)
                ->get(),

            'category_dist' => Category::withCount('whatsappGroups')
                ->get()
                ->map(function ($cat) {
                    return [
                        'name' => $cat->name,
                        'value' => $cat->whatsapp_groups_count > 0 ? $cat->whatsapp_groups_count : 1,
                    ];
                }),

            'reg_growth' => $this->analytics->registrationGrowth(),
        ];

        return response()->json([
            'status' => 'success',
            'success' => true,
            'data' => $metrics,
        ]);
    }
}
