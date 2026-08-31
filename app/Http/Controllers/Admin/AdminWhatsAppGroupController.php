<?php

namespace App\Http\Controllers\Admin;

use App\Exceptions\GuardedDeletionException;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Http\Requests\Admin\StoreWhatsAppGroupRequest;
use App\Http\Requests\Admin\UpdateWhatsAppGroupRequest;
use App\Models\WhatsAppGroup;
use App\Services\GuardedRecordDeletionService;
use App\Services\WhatsAppGroupPrimaryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminWhatsAppGroupController extends Controller
{
    use RespondsWithJson;

    public function __construct(
        private readonly GuardedRecordDeletionService $guardedDeletion,
        private readonly WhatsAppGroupPrimaryService $primaryService,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $query = WhatsAppGroup::query()
            ->with(['category:id,name'])
            ->withCount(['members'])
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

        if ($request->has('is_primary')) {
            $query->where('is_primary', $request->boolean('is_primary'));
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
        $data = $request->validated();
        $isPrimary = (bool) ($data['is_primary'] ?? false);
        unset($data['is_primary']);

        $data['max_members'] = $data['max_members'] ?? WhatsAppGroup::MAX_MEMBERS;

        $group = WhatsAppGroup::create($data);

        if ($isPrimary) {
            $group = $this->primaryService->setPrimary($group);
        }

        return $this->successResponse(
            'WhatsApp group created successfully.',
            $group->fresh(['category:id,name']),
            [],
            201
        );
    }

    public function show(WhatsAppGroup $whatsappGroup): JsonResponse
    {
        return $this->successResponse(
            'WhatsApp group fetched successfully.',
            $whatsappGroup->load(['category:id,name'])
        );
    }

    public function update(UpdateWhatsAppGroupRequest $request, WhatsAppGroup $whatsappGroup): JsonResponse
    {
        $data = $request->validated();
        $isPrimary = array_key_exists('is_primary', $data) ? (bool) $data['is_primary'] : null;
        unset($data['is_primary']);

        if ($whatsappGroup->status === 'full' && ($data['max_members'] ?? 0) > $whatsappGroup->current_members) {
            $data['status'] = 'active';
        }

        $whatsappGroup->update($data);

        if ($isPrimary === true) {
            $whatsappGroup = $this->primaryService->setPrimary($whatsappGroup);
        } elseif ($isPrimary === false && $whatsappGroup->is_primary) {
            $whatsappGroup = $this->primaryService->clearPrimary($whatsappGroup);
        }

        return $this->successResponse(
            'WhatsApp group updated successfully.',
            $whatsappGroup->fresh(['category:id,name'])
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
