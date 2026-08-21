<?php

namespace App\Http\Controllers\Admin;

use App\Enums\Status;
use App\Exceptions\GuardedDeletionException;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Http\Requests\Admin\StoreRegionRequest;
use App\Http\Requests\Admin\UpdateRegionRequest;
use App\Models\Region;
use App\Services\GuardedRecordDeletionService;
use App\Services\LocationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminRegionController extends Controller
{
    use RespondsWithJson;

    public function __construct(
        private readonly LocationService $locationService,
        private readonly GuardedRecordDeletionService $guardedDeletion,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $regions = $this->locationService->paginateRegions(
            $request->only(['search', 'status', 'country_id']),
            (int) $request->input('per_page', 15)
        );

        return $this->successResponse(
            'Regions fetched successfully.',
            $regions->items(),
            [
                'current_page' => $regions->currentPage(),
                'last_page' => $regions->lastPage(),
                'per_page' => $regions->perPage(),
                'total' => $regions->total(),
            ]
        );
    }

    public function store(StoreRegionRequest $request): JsonResponse
    {
        $region = Region::create($request->validated());

        return $this->successResponse('Region created successfully.', $region->load('country'), [], 201);
    }

    public function show(Region $region): JsonResponse
    {
        return $this->successResponse('Region fetched successfully.', $region->load('country'));
    }

    public function update(UpdateRegionRequest $request, Region $region): JsonResponse
    {
        $region->update($request->validated());

        return $this->successResponse('Region updated successfully.', $region->fresh()->load('country'));
    }

    public function updateStatus(Request $request, Region $region): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'in:active,inactive'],
        ]);

        $region = $this->locationService->toggleStatus(
            $region,
            Status::from($validated['status'])
        );

        return $this->successResponse('Region status updated successfully.', $region);
    }

    public function destroy(Region $region): JsonResponse
    {
        try {
            $this->guardedDeletion->deleteRegion($region);
        } catch (GuardedDeletionException $e) {
            return $this->errorResponse($e->getMessage(), $e->errors, $e->status);
        }

        $this->locationService->clearLocationCache();

        return $this->successResponse('State deleted successfully.');
    }
}
