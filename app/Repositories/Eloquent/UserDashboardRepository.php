<?php

namespace App\Repositories\Eloquent;

use App\Models\Category;
use App\Models\User;
use App\Repositories\Contracts\UserDashboardRepositoryInterface;
use App\Services\CommunityAssignmentService;
use App\Services\LocationService;
use App\Services\UserCategoryService;
use Illuminate\Support\Facades\Hash;

class UserDashboardRepository implements UserDashboardRepositoryInterface
{
    public function __construct(
        private readonly CommunityAssignmentService $assignmentService,
        private readonly LocationService $locationService,
        private readonly UserCategoryService $userCategoryService,
    ) {
    }

    public function getDashboardData(User $user): array
    {
        $user->load(['category', 'categories', 'whatsappGroups', 'country', 'region', 'city']);

        if ($this->userCategoryService->resolveCategoryIds($user)->isEmpty()) {
            $defaultCat = Category::where('slug', 'yoga')->first() ?? Category::first();
            if ($defaultCat) {
                $this->userCategoryService->sync($user, [$defaultCat->id]);
                $this->assignmentService->autoAssign($user->fresh());
                $user->load(['category', 'categories', 'whatsappGroups']);
            }
        }

        $fields = [
            $user->name,
            $user->email,
            $user->mobile,
            $user->country_id,
            $user->region_id,
            $user->city_id,
            $this->userCategoryService->resolveCategoryIds($user)->isNotEmpty() ? 'yes' : null,
            $user->is_verified,
        ];
        $filledCount = count(array_filter($fields));
        $completionPct = round(($filledCount / count($fields)) * 100);

        $categoryCommunityGroups = $this->assignmentService
            ->findGroupsForUserCategories($user)
            ->map(fn (array $row) => [
                'category_id' => $row['category_id'],
                'category_name' => $row['category_name'],
                'status' => $row['status'],
                'message' => $row['message'] ?? null,
                'group_id' => $row['group_id'] ?? null,
                'group_name' => $row['group_name'] ?? null,
                'whatsapp_url' => $row['whatsapp_url'] ?? null,
                'description' => $row['description'] ?? null,
            ])
            ->values();

        $community = $user->whatsappGroups->first();
        $categories = Category::where('status', 'active')->get();
        $categoryLabel = $user->categories->pluck('name')->implode(', ')
            ?: ($user->category?->name ?? 'General');

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
                'title' => 'Selected Specialty Categories (' . $categoryLabel . ')',
                'timestamp' => $categoryLabel !== 'General' ? 'Selected' : 'Pending Selection',
                'status' => $categoryLabel !== 'General' ? 'completed' : 'pending',
                'icon' => '🏷️',
            ],
            [
                'title' => 'Local Community Groups (' . $categoryCommunityGroups->where('status', 'matched')->count() . ')',
                'timestamp' => $categoryCommunityGroups->where('status', 'matched')->isNotEmpty() ? 'Available' : 'Pending',
                'status' => $categoryCommunityGroups->where('status', 'matched')->isNotEmpty() ? 'completed' : 'pending',
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
            'categories' => $user->categories->map(fn (Category $category) => [
                'id' => $category->id,
                'name' => $category->name,
                'slug' => $category->slug,
                'description' => $category->description,
                'icon' => $category->icon,
            ])->values(),
            'community_group' => $community ? [
                'id' => $community->id,
                'group_name' => $community->name,
                'group_link' => $community->whatsapp_url,
                'whatsapp_url' => $community->whatsapp_url,
                'status' => $community->status,
            ] : null,
            'community_groups' => $user->whatsappGroups->map(fn ($group) => [
                'id' => $group->id,
                'name' => $group->name,
                'whatsapp_url' => $group->whatsapp_url,
                'description' => $group->description,
                'category_id' => $group->category_id,
            ])->values(),
            'category_community_groups' => $categoryCommunityGroups,
            'registration_status' => [
                'registration_completed' => true,
                'email_verified' => (bool) $user->is_verified,
                'community_assigned' => $user->whatsappGroups->isNotEmpty(),
            ],
            'categories_options' => $categories,
            'timeline' => $timeline,
            'notifications' => [],
            'unread_notifications_count' => 0,
            'upcoming_events' => [],
            'resources' => [],
        ];
    }

    public function updateProfile(User $user, array $data): User
    {
        $oldCategoryIds = $this->userCategoryService->resolveCategoryIds($user)->all();

        $user->update([
            'name' => $data['name'] ?? $user->name,
            'mobile' => $data['phone'] ?? $data['mobile'] ?? $user->mobile,
            'country_id' => $data['country_id'] ?? $user->country_id,
            'region_id' => $data['region_id'] ?? $data['state_id'] ?? $user->region_id,
            'city_id' => $data['city_id'] ?? $user->city_id,
        ]);

        $newCategoryIds = null;
        if (!empty($data['category_ids']) && is_array($data['category_ids'])) {
            $newCategoryIds = $data['category_ids'];
        } elseif (isset($data['category_id'])) {
            $newCategoryIds = [$data['category_id']];
        }

        if ($newCategoryIds !== null) {
            $this->userCategoryService->sync($user, $newCategoryIds);
            if ($newCategoryIds !== $oldCategoryIds) {
                $this->assignmentService->autoAssign($user->fresh());
            }
        }

        return $user->fresh(['category', 'categories', 'whatsappGroups', 'country', 'region', 'city']);
    }

    public function changePassword(User $user, string $newPassword): bool
    {
        return $user->update([
            'password' => Hash::make($newPassword),
        ]);
    }
}
