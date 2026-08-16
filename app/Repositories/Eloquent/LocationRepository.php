<?php

namespace App\Repositories\Eloquent;

use App\Models\City;
use App\Models\Country;
use App\Models\Region;
use App\Repositories\Contracts\LocationRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;

class LocationRepository implements LocationRepositoryInterface
{
    public function getAllCountries(): Collection
    {
        return Country::active()
            ->select('id', 'name', 'code', 'phone_code')
            ->orderBy('name', 'asc')
            ->get();
    }

    public function getStatesByCountry(int $countryId): Collection
    {
        return $this->getRegionsByCountry($countryId);
    }

    public function getRegionsByCountry(int $countryId): Collection
    {
        return Region::active()
            ->where('country_id', $countryId)
            ->select('id', 'country_id', 'name', 'code', 'type')
            ->orderBy('name', 'asc')
            ->get();
    }

    public function getCitiesByState(int $stateId): Collection
    {
        return $this->getCitiesByRegion($stateId);
    }

    public function getCitiesByRegion(int $regionId): Collection
    {
        return City::active()
            ->where('region_id', $regionId)
            ->select('id', 'region_id', 'name', 'latitude', 'longitude')
            ->orderBy('name', 'asc')
            ->get();
    }
}
