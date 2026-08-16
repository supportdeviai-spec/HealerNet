<?php

namespace App\Http\Controllers\Admin;

use App\Enums\Status;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Http\Requests\Admin\StoreCityRequest;
use App\Http\Requests\Admin\UpdateCityRequest;
use App\Models\City;
use App\Services\LocationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminCityController extends Controller
{
    use RespondsWithJson;

    public function __construct(private readonly LocationService $locationService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $cities = $this->locationService->paginateCities(
            $request->only(['search', 'status', 'country_id', 'region_id']),
            (int) $request->input('per_page', 15)
        );

        return $this->successResponse(
            'Cities fetched successfully.',
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
        $data = $request->safe()->except(['whatsapp_group_id']);
        $city = City::create($data);
        $this->syncPrimaryWhatsappGroup($city, $request->input('whatsapp_group_id'));

        return $this->successResponse(
            'City created successfully.',
            $city->load(['region.country', 'activeWhatsappGroups']),
            [],
            201
        );
    }

    public function show(City $city): JsonResponse
    {
        return $this->successResponse(
            'City fetched successfully.',
            $city->load(['region.country', 'activeWhatsappGroups'])
        );
    }

    public function update(UpdateCityRequest $request, City $city): JsonResponse
    {
        $data = $request->safe()->except(['whatsapp_group_id']);
        $city->update($data);

        if ($request->exists('whatsapp_group_id')) {
            $this->syncPrimaryWhatsappGroup($city, $request->input('whatsapp_group_id'));
        }

        return $this->successResponse(
            'City updated successfully.',
            $city->fresh()->load(['region.country', 'activeWhatsappGroups'])
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

        return $this->successResponse('City status updated successfully.', $city);
    }

    /**
     * Cities show one primary WhatsApp community — keep a single active mapping.
     */
    private function syncPrimaryWhatsappGroup(City $city, mixed $whatsappGroupId): void
    {
        if ($whatsappGroupId === null || $whatsappGroupId === '') {
            return;
        }

        $city->whatsappGroups()->sync([
            $whatsappGroupId => [
                'display_order' => 0,
                'status' => 'active',
            ],
        ]);
    }
}
