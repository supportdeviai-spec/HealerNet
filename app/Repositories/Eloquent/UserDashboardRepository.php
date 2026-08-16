<?php

namespace App\Repositories\Eloquent;

use App\Models\Category;
use App\Models\User;
use App\Repositories\Contracts\UserDashboardRepositoryInterface;
use App\Services\CommunityAssignmentService;
use App\Services\LocationService;
use Illuminate\Support\Facades\Hash;

class UserDashboardRepository implements UserDashboardRepositoryInterface
{
    public function __construct(
        private readonly CommunityAssignmentService $assignmentService,
        private readonly LocationService $locationService,
    ) {
    }

    public function getDashboardData(User $user): array
    {
        $user->load(['category', 'whatsappGroups', 'country', 'region', 'city']);

        if (!$user->category_id) {
            $defaultCat = Category::where('slug', 'yoga')->first() ?? Category::first();
            if ($defaultCat) {
                $user->update(['category_id' => $defaultCat->id]);
                $this->assignmentService->autoAssign($user->fresh());
                $user->load(['category', 'whatsappGroups']);
            }
        }

        $fields = [
            $user->name,
            $user->email,
            $user->mobile,
            $user->country_id,
            $user->region_id,
            $user->city_id,
            $user->category_id,
            $user->is_verified,
        ];
        $filledCount = count(array_filter($fields));
        $completionPct = round(($filledCount / count($fields)) * 100);

        $community = $user->whatsappGroups->first();
        $cityGroups = $user->city_id
            ? $this->locationService->listCommunityGroupsForPublic($user->city_id)
            : collect();

        $categories = Category::where('status', 'active')->get();

        $timeline = [
            [
                'title' => 'Account Registration Completed',
                'timestamp' => $user->created_at ? $user->created_at->format('M d, Y - h:i A') : 'Completed',
                'status' => 'completed',
                'icon' => '🎉',
            ],
            [
                'title' => 'Email Address Verification',
                'timestamp' => $user->is_verified ? 'Verified' : 'Pending Verification',
                'status' => $user->is_verified ? 'completed' : 'pending',
                'icon' => '✉️',
            ],
            [
                'title' => 'Selected Specialty Category (' . ($user->category?->name ?? 'General') . ')',
                'timestamp' => $user->category ? 'Selected' : 'Pending Selection',
                'status' => $user->category ? 'completed' : 'pending',
                'icon' => '🏷️',
            ],
            [
                'title' => 'Local Community Groups (' . ($cityGroups->count()) . ')',
                'timestamp' => $cityGroups->isNotEmpty() ? 'Available' : 'Pending',
                'status' => $cityGroups->isNotEmpty() ? 'completed' : 'pending',
                'icon' => '💬',
            ],
        ];

        return [
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->mobile,
                'country' => $user->country?->name ?? 'Not Specified',
                'country_id' => $user->country_id,
                'region' => $user->region?->name ?? 'Not Specified',
                'region_id' => $user->region_id,
                'state' => $user->region?->name ?? 'Not Specified',
                'state_id' => $user->region_id,
                'city' => $user->city?->name ?? 'Not Specified',
                'city_id' => $user->city_id,
                'role' => $user->role,
                'is_verified' => $user->is_verified,
                'created_at' => $user->created_at ? $user->created_at->format('F d, Y') : null,
                'profile_completion_pct' => $completionPct,
            ],
            'category' => $user->category ? [
                'id' => $user->category->id,
                'name' => $user->category->name,
                'slug' => $user->category->slug,
                'description' => $user->category->description,
                'icon' => $user->category->icon,
            ] : null,
            'community_group' => $community ? [
                'id' => $community->id,
                'group_name' => $community->name,
                'group_link' => $community->whatsapp_url,
                'whatsapp_url' => $community->whatsapp_url,
                'status' => $community->status,
            ] : null,
            'community_groups' => $cityGroups->map(fn ($group) => [
                'id' => $group['id'] ?? null,
                'name' => $group['name'] ?? null,
                'whatsapp_url' => $group['whatsapp_url'] ?? null,
                'description' => $group['description'] ?? null,
            ])->values(),
            'registration_status' => [
                'registration_completed' => true,
                'email_verified' => (bool) $user->is_verified,
                'community_assigned' => $user->whatsappGroups->isNotEmpty(),
            ],
            'categories' => $categories,
            'timeline' => $timeline,
            'notifications' => [],
            'unread_notifications_count' => 0,
            'upcoming_events' => [],
            'resources' => [],
        ];
    }

    public function updateProfile(User $user, array $data): User
    {
        $oldCategoryId = $user->category_id;

        $user->update([
            'name' => $data['name'] ?? $user->name,
            'mobile' => $data['phone'] ?? $data['mobile'] ?? $user->mobile,
            'country_id' => $data['country_id'] ?? $user->country_id,
            'region_id' => $data['region_id'] ?? $data['state_id'] ?? $user->region_id,
            'city_id' => $data['city_id'] ?? $user->city_id,
        ]);

        if (isset($data['category_id']) && $data['category_id'] != $oldCategoryId) {
            $user->update(['category_id' => $data['category_id']]);
            $this->assignmentService->autoAssign($user->fresh());
        }

        return $user->fresh(['category', 'whatsappGroups', 'country', 'region', 'city']);
    }

    public function changePassword(User $user, string $newPassword): bool
    {
        return $user->update([
            'password' => Hash::make($newPassword),
        ]);
    }
}
