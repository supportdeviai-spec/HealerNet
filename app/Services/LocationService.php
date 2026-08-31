<?php

namespace App\Services;

use App\Enums\Status;
use App\Models\City;
use App\Models\CommunityGroup;
use App\Models\Country;
use App\Models\Region;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Collection as SupportCollection;
use Illuminate\Support\Facades\Cache;

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
        return collect();
    }

    public function paginateCountries(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $filters = $this->normalizeFilters($filters);
        $query = Country::query()
            ->withCount([
                'regions',
                'users as users_count' => fn (Builder $q) => $q->withTrashed()->notAdmin(),
            ])
            ->orderBy('name');

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
            ->withCount([
                'cities',
                'users as users_count' => fn (Builder $q) => $q->withTrashed()->notAdmin(),
            ])
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
        ])
            ->withCount([
                'communityGroups',
                'users as users_count' => fn (Builder $q) => $q->withTrashed()->notAdmin(),
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

    /**
     * Soft-deactivate a location record (status = inactive).
     * Inactive locations are hidden from registration dropdowns only.
     * Unused locations can be permanently removed via the guarded delete endpoints.
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
