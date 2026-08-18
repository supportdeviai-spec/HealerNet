<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Http\Requests\Admin\StoreWhatsAppGroupRequest;
use App\Http\Requests\Admin\UpdateWhatsAppGroupRequest;
use App\Models\WhatsAppGroup;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminWhatsAppGroupController extends Controller
{
    use RespondsWithJson;

    public function index(Request $request): JsonResponse
    {
        $query = WhatsAppGroup::withCount(['members'])
            ->orderByDesc('created_at');

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('whatsapp_url', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->boolean('active_only')) {
            $query->where('status', 'active');
        }

        $perPage = (int) $request->input('per_page', 15);
        if ($request->boolean('all')) {
            $groups = $query->get();
            return $this->successResponse('WhatsApp groups fetched successfully.', $groups);
        }

        $groups = $query->paginate($perPage);

        return $this->successResponse(
            'WhatsApp groups fetched successfully.',
            $groups->items(),
            [
                'current_page' => $groups->currentPage(),
                'last_page' => $groups->lastPage(),
                'per_page' => $groups->perPage(),
                'total' => $groups->total(),
            ]
        );
    }

    public function store(StoreWhatsAppGroupRequest $request): JsonResponse
    {
        $group = WhatsAppGroup::create($request->validated());

        return $this->successResponse(
            'WhatsApp group created successfully.',
            $group,
            [],
            201
        );
    }

    public function show(WhatsAppGroup $whatsappGroup): JsonResponse
    {
        return $this->successResponse(
            'WhatsApp group fetched successfully.',
            $whatsappGroup->load(['category:id,name', 'cityMappings.city.region.country'])
        );
    }

    public function update(UpdateWhatsAppGroupRequest $request, WhatsAppGroup $whatsappGroup): JsonResponse
    {
        $data = $request->validated();

        if ($whatsappGroup->status === 'full' && ($data['max_members'] ?? 0) > $whatsappGroup->current_members) {
            $data['status'] = 'active';
        }

        $whatsappGroup->update($data);

        return $this->successResponse(
            'WhatsApp group updated successfully.',
            $whatsappGroup->fresh()
        );
    }

    public function destroy(WhatsAppGroup $whatsappGroup): JsonResponse
    {
        $membersCount = $whatsappGroup->members()->count();
        if ($membersCount > 0) {
            return $this->errorResponse(
                "Cannot delete \"{$whatsappGroup->name}\": {$membersCount} member(s) are still assigned to this community. Unassign or move those users first.",
                [
                    'reason' => 'has_members',
                    'members_count' => $membersCount,
                    'group_name' => $whatsappGroup->name,
                ],
                422
            );
        }

        $citiesCount = $whatsappGroup->cityMappings()->count();
        if ($citiesCount > 0) {
            return $this->errorResponse(
                "Cannot delete \"{$whatsappGroup->name}\": it is still linked to {$citiesCount} district mapping(s). Remove those links in Group Management first.",
                [
                    'reason' => 'has_city_mappings',
                    'cities_count' => $citiesCount,
                    'group_name' => $whatsappGroup->name,
                ],
                422
            );
        }

        $whatsappGroup->delete();

        return $this->successResponse('WhatsApp group deleted successfully.');
    }
}
