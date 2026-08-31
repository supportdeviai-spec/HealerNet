<?php

namespace App\Services;

use App\Models\CityWhatsAppGroup;
use App\Models\WhatsAppGroup;
use Illuminate\Support\Collection;

class CityCategoryMappingGuard
{
    /**
     * Active mappings in a city that resolve to the same whatsapp_groups.category_id.
     *
     * @return Collection<int, CityWhatsAppGroup>
     */
    public function activeMappingsForCityCategory(int $cityId, string $categoryId, ?int $excludeMappingId = null): Collection
    {
        return CityWhatsAppGroup::query()
            ->where('city_id', $cityId)
            ->where('status', 'active')
            ->when($excludeMappingId, fn ($query) => $query->where('id', '!=', $excludeMappingId))
            ->whereHas('whatsappGroup', fn ($query) => $query
                ->where('category_id', $categoryId)
                ->where('status', 'active'))
            ->get();
    }

    public function hasDuplicateActiveCityCategory(int $cityId, string $categoryId, ?int $excludeMappingId = null): bool
    {
        return $this->activeMappingsForCityCategory($cityId, $categoryId, $excludeMappingId)
            ->pluck('whatsapp_group_id')
            ->unique()
            ->count() > 1;
    }

    /**
     * Prevent creating/updating a mapping that would leave two active groups on the same city+category.
     */
    public function wouldCreateDuplicate(
        int $cityId,
        string $whatsappGroupId,
        string $status,
        ?int $excludeMappingId = null
    ): bool {
        if ($status !== 'active') {
            return false;
        }

        $group = WhatsAppGroup::query()->find($whatsappGroupId);
        if (!$group || !$group->category_id || $group->status !== 'active') {
            return false;
        }

        $existing = $this->activeMappingsForCityCategory($cityId, $group->category_id, $excludeMappingId)
            ->pluck('whatsapp_group_id')
            ->unique();

        if ($existing->contains($whatsappGroupId)) {
            return false;
        }

        return $existing->isNotEmpty();
    }

    public function groupRequiresCategory(?WhatsAppGroup $group): bool
    {
        return $group !== null && empty($group->category_id);
    }
}
