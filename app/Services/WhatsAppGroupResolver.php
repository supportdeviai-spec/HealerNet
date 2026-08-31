<?php

namespace App\Services;

use App\Models\Category;
use App\Models\WhatsAppGroup;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

class WhatsAppGroupResolver
{
    public const INVITE_URL_PATTERN = '/^https?:\/\/(chat\.whatsapp\.com|wa\.me|api\.whatsapp\.com)/i';

    public static function hasValidInviteLink(?string $url): bool
    {
        $url = trim((string) $url);

        return $url !== '' && (bool) preg_match(self::INVITE_URL_PATTERN, $url);
    }

    /**
     * Single source of truth: active + primary + valid invite link for a category.
     */
    public function forCategory(string $categoryId): ?WhatsAppGroup
    {
        $group = WhatsAppGroup::query()
            ->eligiblePrimary()
            ->where('category_id', $categoryId)
            ->orderBy('id')
            ->first();

        if (!$group || !self::hasValidInviteLink($group->whatsapp_url)) {
            return null;
        }

        return $group;
    }

    /**
     * Categories that may appear on the registration dropdown.
     *
     * @return Collection<int, Category>
     */
    public function registrationEligibleCategories(): Collection
    {
        $categoryIds = WhatsAppGroup::query()
            ->eligiblePrimary()
            ->whereNotNull('category_id')
            ->pluck('category_id')
            ->unique()
            ->filter(fn ($id) => $this->forCategory((string) $id) !== null)
            ->values();

        if ($categoryIds->isEmpty()) {
            return collect();
        }

        return Category::query()
            ->active()
            ->whereIn('id', $categoryIds)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();
    }

    public function applyEligiblePrimaryScope(Builder $query): Builder
    {
        return $query
            ->where('status', 'active')
            ->where('is_primary', true)
            ->whereNotNull('category_id')
            ->whereNotNull('whatsapp_url')
            ->where('whatsapp_url', '!=', '');
    }
}
