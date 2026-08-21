<?php

namespace App\Http\Controllers\Admin;

use App\Exceptions\GuardedDeletionException;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Http\Requests\Admin\StoreWhatsAppGroupRequest;
use App\Http\Requests\Admin\UpdateWhatsAppGroupRequest;
use App\Models\WhatsAppGroup;
use App\Services\GuardedRecordDeletionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminWhatsAppGroupController extends Controller
{
    use RespondsWithJson;

    public function __construct(private readonly GuardedRecordDeletionService $guardedDeletion)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $query = WhatsAppGroup::withCount(['members', 'cityMappings'])
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
        try {
            $this->guardedDeletion->deleteWhatsAppGroup($whatsappGroup);
        } catch (GuardedDeletionException $e) {
            return $this->errorResponse($e->getMessage(), $e->errors, $e->status);
        }

        return $this->successResponse('WhatsApp group deleted successfully.');
    }
}
