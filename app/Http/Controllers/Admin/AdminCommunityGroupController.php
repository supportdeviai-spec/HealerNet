<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Http\Requests\Admin\StoreCommunityGroupRequest;
use App\Http\Requests\Admin\UpdateCommunityGroupRequest;
use App\Models\City;
use App\Models\CityWhatsAppGroup;
use App\Models\WhatsAppGroup;
use App\Services\LocationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminCommunityGroupController extends Controller
{
    use RespondsWithJson;

    public function __construct(private readonly LocationService $locationService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $groups = $this->locationService->paginateCommunityGroups(
            $request->only(['search', 'status', 'country_id', 'region_id', 'city_id']),
            (int) $request->input('per_page', 15)
        );

        return $this->successResponse(
            'Community groups fetched successfully.',
            $groups->items(),
            [
                'current_page' => $groups->currentPage(),
                'last_page' => $groups->lastPage(),
                'per_page' => $groups->perPage(),
                'total' => $groups->total(),
            ]
        );
    }

    public function store(StoreCommunityGroupRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['display_order'] = $data['display_order'] ?? 0;

        $mapping = CityWhatsAppGroup::create($data);

        return $this->successResponse(
            'Community group mapping created successfully.',
            $this->locationService->formatCityWhatsAppGroup($mapping),
            [],
            201
        );
    }

    public function show(CityWhatsAppGroup $communityGroup): JsonResponse
    {
        return $this->successResponse(
            'Community group mapping fetched successfully.',
            $this->locationService->formatCityWhatsAppGroup(
                $communityGroup->load(['city.region.country', 'whatsappGroup.category'])
            )
        );
    }

    public function update(UpdateCommunityGroupRequest $request, CityWhatsAppGroup $communityGroup): JsonResponse
    {
        $data = $request->validated();
        $data['display_order'] = $data['display_order'] ?? $communityGroup->display_order;

        $communityGroup->update($data);

        return $this->successResponse(
            'Community group mapping updated successfully.',
            $this->locationService->formatCityWhatsAppGroup(
                $communityGroup->fresh()->load(['city.region.country', 'whatsappGroup.category'])
            )
        );
    }

    public function updateStatus(Request $request, CityWhatsAppGroup $communityGroup): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'in:active,inactive'],
        ]);

        $communityGroup->update(['status' => $validated['status']]);

        return $this->successResponse(
            'Community group status updated successfully.',
            $this->locationService->formatCityWhatsAppGroup(
                $communityGroup->fresh()->load(['city.region.country', 'whatsappGroup.category'])
            )
        );
    }

    public function destroy(CityWhatsAppGroup $communityGroup): JsonResponse
    {
        $membersCount = $this->membersUsingMapping($communityGroup);

        if ($membersCount > 0) {
            return $this->errorResponse(
                "Cannot delete: {$membersCount} user(s) in this district are assigned to this WhatsApp community. Unassign or move those users first.",
                ['members_count' => $membersCount],
                422
            );
        }

        $communityGroup->delete();

        return $this->successResponse('Community group mapping deleted successfully.');
    }

    public function availableForCity(Request $request, City $city): JsonResponse
    {
        $validated = $request->validate([
            'exclude_mapping_id' => ['nullable', 'integer', 'exists:city_whatsapp_groups,id'],
        ]);

        $excludeMappingId = $validated['exclude_mapping_id'] ?? null;

        $assignedIds = CityWhatsAppGroup::query()
            ->where('city_id', $city->id)
            ->when($excludeMappingId, fn ($q) => $q->where('id', '!=', $excludeMappingId))
            ->pluck('whatsapp_group_id');

        $groups = WhatsAppGroup::query()
            ->with('category:id,name')
            ->where('status', 'active')
            ->orderBy('name')
            ->get()
            ->map(function (WhatsAppGroup $group) use ($assignedIds) {
                $alreadyAssigned = $assignedIds->contains($group->id);

                return [
                    'id' => $group->id,
                    'name' => $group->name,
                    'category_id' => $group->category_id,
                    'category' => $group->category,
                    'whatsapp_url' => $group->whatsapp_url,
                    'status' => $group->status,
                    'label' => trim($group->name . ($group->category?->name ? ' — ' . $group->category->name : '')),
                    'already_assigned' => $alreadyAssigned,
                    'selectable' => !$alreadyAssigned,
                ];
            })
            ->values();

        return $this->successResponse('Available WhatsApp groups fetched successfully.', $groups);
    }

    /**
     * Users in this city who are members of the mapped WhatsApp community.
     */
    private function membersUsingMapping(CityWhatsAppGroup $mapping): int
    {
        if (!$mapping->whatsapp_group_id || !$mapping->city_id) {
            return 0;
        }

        return (int) DB::table('community_members')
            ->join('users', 'users.id', '=', 'community_members.user_id')
            ->where('community_members.whatsapp_group_id', $mapping->whatsapp_group_id)
            ->where('users.city_id', $mapping->city_id)
            ->count();
    }
}
