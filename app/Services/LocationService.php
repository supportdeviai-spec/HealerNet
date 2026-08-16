<?php

namespace App\Services;

use App\Enums\Status;
use App\Models\City;
use App\Models\CityWhatsAppGroup;
use App\Models\CommunityGroup;
use App\Models\Country;
use App\Models\Region;
use App\Models\WhatsAppGroup;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Collection as SupportCollection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class LocationService
{
    private const CACHE_TTL = 3600;

    public function listCountriesForPublic(?string $search = null): Collection
    {
        $query = Country::active()
            ->select('id', 'name', 'code', 'phone_code')
            ->orderBy('name');

        if ($search) {
            $query->where(function (Builder $q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%");
            });
        }

        return $query->get();
    }

    public function listRegionsForPublic(int $countryId, ?string $search = null): Collection
    {
        if (!Country::active()->whereKey($countryId)->exists()) {
            return new Collection();
        }

        $query = Region::active()
            ->where('country_id', $countryId)
            ->select('id', 'country_id', 'name', 'code', 'type')
            ->orderBy('name');

        if ($search) {
            $query->where('name', 'like', "%{$search}%");
        }

        return $query->get();
    }

    public function listCitiesForPublic(int $regionId, ?string $search = null): Collection
    {
        if (!Region::active()
            ->whereKey($regionId)
            ->whereHas('country', fn (Builder $q) => $q->where('status', Status::ACTIVE))
            ->exists()) {
            return new Collection();
        }

        $query = City::active()
            ->where('region_id', $regionId)
            ->select('id', 'region_id', 'name', 'latitude', 'longitude')
            ->orderBy('name');

        if ($search) {
            $query->where('name', 'like', "%{$search}%");
        }

        return $query->get();
    }

    public function listCommunityGroupsForPublic(int $cityId): SupportCollection
    {
        if (!City::active()
            ->whereKey($cityId)
            ->whereHas('region', fn (Builder $q) => $q
                ->where('status', Status::ACTIVE)
                ->whereHas('country', fn (Builder $cq) => $cq->where('status', Status::ACTIVE)))
            ->exists()) {
            return new Collection();
        }

        return CityWhatsAppGroup::query()
            ->where('city_whatsapp_groups.status', 'active')
            ->where('city_whatsapp_groups.city_id', $cityId)
            ->whereHas('whatsappGroup', fn (Builder $q) => $q->where('whatsapp_groups.status', 'active'))
            ->with(['whatsappGroup.category:id,name'])
            ->orderBy('display_order')
            ->get()
            ->map(fn (CityWhatsAppGroup $mapping) => $this->formatPublicCommunityGroup($mapping))
            ->sortBy('display_order')
            ->values();
    }

    public function formatPublicCommunityGroup(CityWhatsAppGroup $mapping): array
    {
        $group = $mapping->whatsappGroup;

        return [
            'id' => $group?->id,
            'city_id' => $mapping->city_id,
            'category_id' => $group?->category_id,
            'name' => $group?->name,
            'description' => $group?->description,
            'whatsapp_url' => $group?->whatsapp_url,
            'display_order' => $mapping->display_order,
            'category' => $group?->category ? [
                'id' => $group->category->id,
                'name' => $group->category->name,
            ] : null,
        ];
    }

    public function formatCityWhatsAppGroup(CityWhatsAppGroup $mapping): array
    {
        $mapping->loadMissing(['city.region.country', 'whatsappGroup.category']);
        $group = $mapping->whatsappGroup;
        $city = $mapping->city;

        $membersCount = 0;
        if ($mapping->whatsapp_group_id && $mapping->city_id) {
            $membersCount = (int) DB::table('community_members')
                ->join('users', 'users.id', '=', 'community_members.user_id')
                ->where('community_members.whatsapp_group_id', $mapping->whatsapp_group_id)
                ->where('users.city_id', $mapping->city_id)
                ->count();
        }

        return [
            'id' => $mapping->id,
            'city_id' => $mapping->city_id,
            'whatsapp_group_id' => $mapping->whatsapp_group_id,
            'display_order' => $mapping->display_order,
            'status' => $mapping->status,
            'city' => $city,
            'whatsapp_group' => $group,
            'name' => $group?->name,
            'category' => $group?->category,
            'category_name' => $group?->category?->name,
            'whatsapp_url' => $group?->whatsapp_url,
            'country_name' => $city?->region?->country?->name,
            'region_name' => $city?->region?->name,
            'state_name' => $city?->region?->name,
            'members_count' => $membersCount,
            'can_delete' => $membersCount === 0,
        ];
    }

    public function paginateCountries(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $filters = $this->normalizeFilters($filters);
        $query = Country::query()->orderBy('name');

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function (Builder $q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%");
            });
        }

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        return $query->paginate($perPage);
    }

    public function paginateRegions(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $filters = $this->normalizeFilters($filters);
        $query = Region::with('country:id,name,code')
            ->orderBy('name');

        if (!empty($filters['country_id'])) {
            $query->where('country_id', $filters['country_id']);
        }

        if (!empty($filters['search'])) {
            $query->where('name', 'like', "%{$filters['search']}%");
        }

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        return $query->paginate($perPage);
    }

    public function paginateCities(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $filters = $this->normalizeFilters($filters);
        $query = City::with([
            'region.country:id,name',
            'activeWhatsappGroups:id,name,whatsapp_url,status',
        ])
            ->orderBy('name');

        if (!empty($filters['country_id'])) {
            $query->whereHas('region', fn (Builder $q) => $q->where('country_id', $filters['country_id']));
        }

        if (!empty($filters['region_id'])) {
            $query->where('region_id', $filters['region_id']);
        }

        if (!empty($filters['search'])) {
            $query->where('name', 'like', "%{$filters['search']}%");
        }

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        return $query->paginate($perPage);
    }

    public function paginateCommunityGroups(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $filters = $this->normalizeFilters($filters);
        $query = CityWhatsAppGroup::with([
            'city.region.country:id,name',
            'whatsappGroup.category:id,name',
        ])
            ->orderBy('display_order')
            ->orderBy('id');

        if (!empty($filters['country_id'])) {
            $query->whereHas('city.region', fn (Builder $q) => $q->where('country_id', $filters['country_id']));
        }

        if (!empty($filters['region_id'])) {
            $query->whereHas('city', fn (Builder $q) => $q->where('region_id', $filters['region_id']));
        }

        if (!empty($filters['city_id'])) {
            $query->where('city_id', $filters['city_id']);
        }

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->whereHas('whatsappGroup', fn (Builder $q) => $q->where('name', 'like', "%{$search}%"));
        }

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        $paginator = $query->paginate($perPage);
        $paginator->getCollection()->transform(
            fn (CityWhatsAppGroup $mapping) => $this->formatCityWhatsAppGroup($mapping)
        );

        return $paginator;
    }

    /**
     * Soft-deactivate a location record (status = inactive).
     * Records are never hard-deleted so registered users keep valid references.
     * Inactive locations are hidden from registration dropdowns only.
     */
    public function toggleStatus(object $model, Status $status): object
    {
        $model->update(['status' => $status]);

        if ($status === Status::INACTIVE) {
            $this->cascadeInactive($model);
        }

        $this->clearLocationCache();

        return $model->fresh();
    }

    private function cascadeInactive(object $model): void
    {
        if ($model instanceof Country) {
            Region::where('country_id', $model->id)->update(['status' => Status::INACTIVE]);
            City::whereHas('region', fn (Builder $q) => $q->where('country_id', $model->id))
                ->update(['status' => Status::INACTIVE]);
            return;
        }

        if ($model instanceof Region) {
            City::where('region_id', $model->id)->update(['status' => Status::INACTIVE]);
        }
    }

    public function clearLocationCache(): void
    {
        Cache::forget('location.countries.active');
    }

    private function normalizeFilters(array $filters): array
    {
        foreach (['search', 'status', 'country_id', 'region_id', 'city_id'] as $key) {
            if (!array_key_exists($key, $filters)) {
                continue;
            }

            $value = $filters[$key];
            if ($value === null || $value === '' || $value === 'undefined' || $value === 'null') {
                unset($filters[$key]);
            }
        }

        return $filters;
    }

    /**
     * Placeholder for future geolocation provider integration.
     */
    public function findNearestCity(float $latitude, float $longitude): ?City
    {
        return City::active()
            ->whereNotNull('latitude')
            ->whereNotNull('longitude')
            ->selectRaw('*, (
                6371 * acos(
                    cos(radians(?)) * cos(radians(latitude)) *
                    cos(radians(longitude) - radians(?)) +
                    sin(radians(?)) * sin(radians(latitude))
                )
            ) AS distance', [$latitude, $longitude, $latitude])
            ->orderBy('distance')
            ->first();
    }
}
