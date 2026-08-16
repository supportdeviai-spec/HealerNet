<?php

namespace App\Http\Controllers\Admin;

use App\Enums\Status;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Http\Requests\Admin\StoreCountryRequest;
use App\Http\Requests\Admin\UpdateCountryRequest;
use App\Models\Country;
use App\Services\LocationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminCountryController extends Controller
{
    use RespondsWithJson;

    public function __construct(private readonly LocationService $locationService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $countries = $this->locationService->paginateCountries(
            $request->only(['search', 'status']),
            (int) $request->input('per_page', 15)
        );

        return $this->successResponse(
            'Countries fetched successfully.',
            $countries->items(),
            [
                'current_page' => $countries->currentPage(),
                'last_page' => $countries->lastPage(),
                'per_page' => $countries->perPage(),
                'total' => $countries->total(),
            ]
        );
    }

    public function store(StoreCountryRequest $request): JsonResponse
    {
        $country = Country::create($request->validated());
        $this->locationService->clearLocationCache();

        return $this->successResponse('Country created successfully.', $country, [], 201);
    }

    public function show(Country $country): JsonResponse
    {
        return $this->successResponse('Country fetched successfully.', $country);
    }

    public function update(UpdateCountryRequest $request, Country $country): JsonResponse
    {
        $country->update($request->validated());
        $this->locationService->clearLocationCache();

        return $this->successResponse('Country updated successfully.', $country->fresh());
    }

    public function updateStatus(Request $request, Country $country): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'in:active,inactive'],
        ]);

        $country = $this->locationService->toggleStatus(
            $country,
            Status::from($validated['status'])
        );

        return $this->successResponse('Country status updated successfully.', $country);
    }
}
