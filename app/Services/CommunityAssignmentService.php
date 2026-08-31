<?php

namespace App\Services;

use App\Models\Category;
use App\Models\User;
use App\Models\WhatsAppGroup;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CommunityAssignmentService
{
    public function __construct(
        private readonly UserCategoryService $userCategoryService,
        private readonly WhatsAppGroupResolver $groupResolver,
    ) {
    }

    /**
     * Assign user to the primary WhatsApp group for each selected category.
     */
    public function autoAssign(User $user): array
    {
        $categories = $this->userCategoryService->resolveCategoryModels($user);
        if ($categories->isEmpty()) {
            return ['success' => false, 'message' => 'User has no categories defined.', 'groups' => []];
        }

        $assigned = collect();

        try {
            DB::transaction(function () use ($user, $categories, &$assigned) {
                foreach ($categories as $category) {
                    if ($this->userAlreadyAssignedForCategory($user, $category->id)) {
                        continue;
                    }

                    $group = $this->groupResolver->forCategory($category->id);
                    if (!$group) {
                        continue;
                    }

                    $group = WhatsAppGroup::query()->whereKey($group->id)->lockForUpdate()->first();
                    if (!$group || $group->status !== 'active') {
                        continue;
                    }

                    if ($group->max_members && $group->current_members >= $group->max_members) {
                        continue;
                    }

                    $user->whatsappGroups()->attach($group->id, ['joined_at' => now()]);
                    $group->increment('current_members');
                    $group->refresh();

                    if ($group->max_members && $group->current_members >= $group->max_members) {
                        $group->update(['status' => 'full']);
                        Log::info("System Auth: Auto-Closed WhatsApp Group ID: {$group->id} as it reached max_members.");
                    }

                    $assigned->push($group);
                }
            });

            $user->load('whatsappGroups');

            return [
                'success' => $assigned->isNotEmpty() || $user->whatsappGroups->isNotEmpty(),
                'groups' => $assigned->values()->all(),
                'message' => $assigned->isNotEmpty()
                    ? 'User assigned to community group(s).'
                    : 'No matching WhatsApp communities were available for assignment.',
            ];
        } catch (\Exception $e) {
            Log::warning("Community Auto Assignment Failed for User {$user->id}: " . $e->getMessage());

            return ['success' => false, 'message' => $e->getMessage(), 'groups' => []];
        }
    }

    /**
     * Per-category primary group results for display (registration success, dashboard).
     *
     * @return Collection<int, array<string, mixed>>
     */
    public function findGroupsForUserCategories(User $user): Collection
    {
        return $this->userCategoryService->resolveCategoryModels($user)->map(function (Category $category) {
            $group = $this->groupResolver->forCategory($category->id);

            if (!$group) {
                return $this->formatCategoryResult(
                    $category,
                    null,
                    'not_found',
                    'No WhatsApp group is currently available for this category.'
                );
            }

            return $this->formatCategoryResult($category, $group, 'matched');
        });
    }

    /**
     * WhatsApp groups for welcome email: assigned groups first, else category-primary matches.
     *
     * @return Collection<int, WhatsAppGroup>
     */
    public function welcomeCommunityGroups(User $user): Collection
    {
        $user->loadMissing(['whatsappGroups.category']);

        if ($user->whatsappGroups->isNotEmpty()) {
            return $user->whatsappGroups->values();
        }

        return $this->findGroupsForUserCategories($user)
            ->filter(fn (array $row) => $row['status'] === 'matched' && $row['group'] instanceof WhatsAppGroup)
            ->map(fn (array $row) => $row['group'])
            ->values();
    }

    /**
     * @deprecated Use welcomeCommunityGroups() for multi-category support.
     */
    public function welcomeCommunityGroup(User $user): ?WhatsAppGroup
    {
        return $this->welcomeCommunityGroups($user)->first();
    }

    private function userAlreadyAssignedForCategory(User $user, string $categoryId): bool
    {
        return $user->whatsappGroups()
            ->where('whatsapp_groups.category_id', $categoryId)
            ->exists();
    }

    private function formatCategoryResult(
        Category $category,
        ?WhatsAppGroup $group,
        string $status,
        ?string $message = null
    ): array {
        return [
            'category_id' => $category->id,
            'category_name' => $category->name,
            'status' => $status,
            'message' => $message,
            'group' => $group,
            'group_id' => $group?->id,
            'group_name' => $group?->name,
            'whatsapp_url' => $group?->whatsapp_url,
            'description' => $group?->description,
        ];
    }
}
