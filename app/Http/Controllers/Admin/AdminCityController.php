<?php

namespace App\Http\Controllers\Admin;

use App\Enums\Status;
use App\Exceptions\GuardedDeletionException;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Http\Requests\Admin\StoreCityRequest;
use App\Http\Requests\Admin\UpdateCityRequest;
use App\Models\City;
use App\Services\GuardedRecordDeletionService;
use App\Services\LocationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminCityController extends Controller
{
    use RespondsWithJson;

    public function __construct(
        private readonly LocationService $locationService,
        private readonly GuardedRecordDeletionService $guardedDeletion,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $cities = $this->locationService->paginateCities(
            $request->only(['search', 'status', 'country_id', 'region_id']),
            (int) $request->input('per_page', 15)
        );

        return $this->successResponse(
            'Districts fetched successfully.',
            $cities->items(),
            [
                'current_page' => $cities->currentPage(),
                'last_page' => $cities->lastPage(),
                'per_page' => $cities->perPage(),
                'total' => $cities->total(),
            ]
        );
    }

    public function store(StoreCityRequest $request): JsonResponse
    {
        $city = City::create($request->safe()->except(['whatsapp_group_id']));
        $this->locationService->clearLocationCache();

        return $this->successResponse(
            'District created successfully.',
            $city->load(['region.country']),
            [],
            201
        );
    }

    public function show(City $city): JsonResponse
    {
        return $this->successResponse(
            'District fetched successfully.',
            $city->load(['region.country'])
        );
    }

    public function update(UpdateCityRequest $request, City $city): JsonResponse
    {
        $city->update($request->safe()->except(['whatsapp_group_id']));
        $this->locationService->clearLocationCache();

        return $this->successResponse(
            'District updated successfully.',
            $city->fresh()->load(['region.country'])
        );
    }

    public function updateStatus(Request $request, City $city): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'in:active,inactive'],
        ]);

        $city = $this->locationService->toggleStatus(
            $city,
            Status::from($validated['status'])
        );

        return $this->successResponse('District status updated successfully.', $city);
    }

    public function destroy(City $city): JsonResponse
    {
        try {
            $this->guardedDeletion->deleteCity($city);
        } catch (GuardedDeletionException $e) {
            return $this->errorResponse($e->getMessage(), $e->errors, $e->status);
        }

        $this->locationService->clearLocationCache();

        return $this->successResponse('District deleted successfully.');
    }
}
