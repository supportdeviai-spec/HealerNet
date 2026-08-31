<?php

namespace App\Services;

use App\Models\Category;
use App\Models\User;
use Illuminate\Support\Collection;

class UserCategoryService
{
    public const MAX_CATEGORIES = 3;

    /**
     * @param  list<string>  $categoryIds
     */
    public function sync(User $user, array $categoryIds): void
    {
        $categoryIds = collect($categoryIds)
            ->filter()
            ->unique()
            ->values()
            ->take(self::MAX_CATEGORIES)
            ->all();

        $user->categories()->sync($categoryIds);
        $user->forceFill(['category_id' => $categoryIds[0] ?? null])->saveQuietly();
    }

    public function resolveCategoryModels(User $user): Collection
    {
        $user->loadMissing('categories');

        if ($user->categories->isNotEmpty()) {
            return $user->categories;
        }

        if ($user->category_id) {
            $category = Category::query()->find($user->category_id);
            if ($category) {
                return collect([$category]);
            }
        }

        return collect();
    }

    /**
     * @return Collection<int, string>
     */
    public function resolveCategoryIds(User $user): Collection
    {
        return $this->resolveCategoryModels($user)->pluck('id');
    }
}
