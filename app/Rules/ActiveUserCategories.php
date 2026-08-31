<?php

namespace App\Rules;

use App\Models\Category;
use App\Services\UserCategoryService;
use App\Services\WhatsAppGroupResolver;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class ActiveUserCategories implements ValidationRule
{
    public function __construct(
        private readonly int $min = 1,
        private readonly int $max = UserCategoryService::MAX_CATEGORIES,
        private readonly bool $requirePrimaryWhatsAppGroup = false,
    ) {
    }

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (!is_array($value)) {
            $fail('Categories must be provided as a list.');

            return;
        }

        $ids = array_values(array_unique(array_filter($value)));

        if (count($ids) < $this->min) {
            $fail('Select at least one healthcare category.');

            return;
        }

        if (count($ids) > $this->max) {
            $fail('You may select up to ' . $this->max . ' categories.');

            return;
        }

        if ($this->requirePrimaryWhatsAppGroup) {
            $eligibleIds = app(WhatsAppGroupResolver::class)
                ->registrationEligibleCategories()
                ->pluck('id')
                ->map(fn ($id) => (string) $id)
                ->all();

            foreach ($ids as $id) {
                if (!in_array((string) $id, $eligibleIds, true)) {
                    $fail('Selected category is currently unavailable, please choose another.');

                    return;
                }
            }

            return;
        }

        $activeCount = Category::query()
            ->active()
            ->whereIn('id', $ids)
            ->count();

        if ($activeCount !== count($ids)) {
            $fail('One or more selected categories are invalid or inactive.');
        }
    }
}
