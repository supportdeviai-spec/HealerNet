<?php

namespace App\Http\Controllers\Api;

use App\Enums\Status;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Models\City;
use App\Models\Country;
use App\Models\Region;
use App\Services\LocationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PublicLocationController extends Controller
{
    use RespondsWithJson;

    public function __construct(private readonly LocationService $locationService)
    {
    }

    public function countries(Request $request): JsonResponse
    {
        $countries = $this->locationService->listCountriesForPublic($request->query('search'));

        return $this->successResponse('Countries fetched successfully.', $countries);
    }

    public function regions(Request $request, Country $country): JsonResponse
    {
        if ($country->status !== Status::ACTIVE) {
            return $this->errorResponse('Country is not available.', 404);
        }

        $regions = $this->locationService->listRegionsForPublic(
            $country->id,
            $request->query('search')
        );

        return $this->successResponse('Regions fetched successfully.', $regions);
    }

    public function cities(Request $request, Region $region): JsonResponse
    {
        if ($region->status !== Status::ACTIVE || $region->country?->status !== Status::ACTIVE) {
            return $this->errorResponse('State is not available.', 404);
        }

        $cities = $this->locationService->listCitiesForPublic(
            $region->id,
            $request->query('search')
        );

        return $this->successResponse('Cities fetched successfully.', $cities);
    }

    public function communityGroups(City $city): JsonResponse
    {
        $city->loadMissing('region.country');
        if ($city->status !== Status::ACTIVE
            || $city->region?->status !== Status::ACTIVE
            || $city->region?->country?->status !== Status::ACTIVE) {
            return $this->errorResponse('City is not available.', 404);
        }

        $groups = $this->locationService->listCommunityGroupsForPublic($city->id);

        return $this->successResponse('Community groups fetched successfully.', $groups);
    }
}
