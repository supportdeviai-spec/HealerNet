<?php

namespace App\Http\Controllers\Admin;

use App\Enums\Status;
use App\Exceptions\GuardedDeletionException;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Http\Requests\Admin\StoreCityRequest;
use App\Http\Requests\Admin\UpdateCityRequest;
use App\Models\City;
use App\Models\CityWhatsAppGroup;
use App\Services\GuardedRecordDeletionService;
use App\Services\LocationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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
        $data = $request->safe()->except(['whatsapp_group_id']);
        $city = City::create($data);
        $this->syncPrimaryWhatsappGroup($city, $request->input('whatsapp_group_id'));
        $this->locationService->clearLocationCache();

        return $this->successResponse(
            'District created successfully.',
            $city->load(['region.country', 'activeWhatsappGroups']),
            [],
            201
        );
    }

    public function show(City $city): JsonResponse
    {
        return $this->successResponse(
            'District fetched successfully.',
            $city->load(['region.country', 'activeWhatsappGroups'])
        );
    }

    public function update(UpdateCityRequest $request, City $city): JsonResponse
    {
        try {
            DB::transaction(function () use ($request, $city) {
                $data = $request->safe()->except(['whatsapp_group_id']);
                $city->update($data);

                if ($request->exists('whatsapp_group_id')) {
                    $this->syncPrimaryWhatsappGroup($city, $request->input('whatsapp_group_id'), allowClear: true);
                }
            });
        } catch (GuardedDeletionException $e) {
            return $this->errorResponse($e->getMessage(), $e->errors, $e->status);
        }

        $this->locationService->clearLocationCache();

        return $this->successResponse(
            'District updated successfully.',
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

    /**
     * Cities show one primary WhatsApp community — keep a single active mapping.
     * Passing null with $allowClear removes the mapping without deleting users or the group.
     */
    private function syncPrimaryWhatsappGroup(City $city, mixed $whatsappGroupId, bool $allowClear = false): void
    {
        if ($whatsappGroupId === null || $whatsappGroupId === '') {
            if (! $allowClear) {
                return;
            }

            $this->assertDistrictMappingsUnused($city);
            $city->whatsappGroups()->sync([]);

            return;
        }

        $this->assertDistrictMappingsUnused($city, (string) $whatsappGroupId);

        $city->whatsappGroups()->sync([
            $whatsappGroupId => [
                'display_order' => 0,
                'status' => 'active',
            ],
        ]);
    }

    private function assertDistrictMappingsUnused(City $city, ?string $keepGroupId = null): void
    {
        $mappings = CityWhatsAppGroup::query()
            ->where('city_id', $city->id)
            ->when($keepGroupId, fn ($q) => $q->where('whatsapp_group_id', '!=', $keepGroupId))
            ->get();

        foreach ($mappings as $mapping) {
            $membersCount = (int) DB::table('community_members')
                ->join('users', 'users.id', '=', 'community_members.user_id')
                ->where('community_members.whatsapp_group_id', $mapping->whatsapp_group_id)
                ->where('users.city_id', $mapping->city_id)
                ->count();

            if ($membersCount > 0) {
                throw new GuardedDeletionException(
                    "Cannot unassign this WhatsApp community because {$membersCount} user(s) in this district are still assigned to it.",
                    [
                        'reason' => 'has_members',
                        'members_count' => $membersCount,
                    ]
                );
            }
        }
    }
}
