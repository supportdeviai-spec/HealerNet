<?php

namespace App\Repositories\Contracts;

use Illuminate\Database\Eloquent\Collection;

interface LocationRepositoryInterface
{
    public function getAllCountries(): Collection;
    public function getStatesByCountry(int $countryId): Collection;
    public function getCitiesByState(int $stateId): Collection;
}