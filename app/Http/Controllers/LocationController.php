<?php

namespace App\Http\Controllers;

use App\Enums\Status;
use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Models\City;
use App\Models\Country;
use App\Models\Region;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LocationController extends Controller
{
    use RespondsWithJson;

    /**
     * Legacy location endpoints — delegates to active-only records.
     */
    public function countries(): JsonResponse
    {
        $countries = Country::active()
            ->select('id', 'name', 'code', 'phone_code')
            ->orderBy('name')
            ->get();

        return $this->successResponse('Countries fetched successfully.', $countries);
    }

    public function regions(Request $request, $countryId = null): JsonResponse
    {
        $cId = $countryId ?? $request->query('country_id');
        $countryName = $request->query('country_name') ?? $request->query('country');

        $query = Region::active()->select('id', 'country_id', 'name', 'code', 'type');

        if ($cId) {
            $query->where('country_id', $cId);
        } elseif ($countryName) {
            $country = Country::where('name', $countryName)->first();
            if ($country) {
                $query->where('country_id', $country->id);
            }
        }

        return $this->successResponse('Regions fetched successfully.', $query->orderBy('name')->get());
    }

    /** @deprecated Use regions() */
    public function states(Request $request, $countryId = null): JsonResponse
    {
        return $this->regions($request, $countryId);
    }

    public function cities(Request $request, $regionId = null): JsonResponse
    {
        $rId = $regionId ?? $request->query('region_id') ?? $request->query('state_id');
        $regionName = $request->query('region_name') ?? $request->query('state_name') ?? $request->query('state');

        $query = City::active()->select('id', 'region_id', 'name', 'latitude', 'longitude');

        if ($rId) {
            $query->where('region_id', $rId);
        } elseif ($regionName) {
            $region = Region::where('name', $regionName)->first();
            if ($region) {
                $query->where('region_id', $region->id);
            }
        }

        $cities = $query->orderBy('name')->get()->map(function (City $city) {
            return [
                'id' => $city->id,
                'region_id' => $city->region_id,
                'state_id' => $city->region_id,
                'name' => $city->name,
                'latitude' => $city->latitude,
                'longitude' => $city->longitude,
            ];
        });

        return $this->successResponse('Districts fetched successfully.', $cities);
    }
}
