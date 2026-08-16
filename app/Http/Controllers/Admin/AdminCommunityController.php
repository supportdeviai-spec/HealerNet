<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CommunityGroup;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminCommunityController extends Controller
{
    /**
     * List all community cohorts (Step 11)
     */
    public function index(Request $request): JsonResponse
    {
        $query = CommunityGroup::with(['category', 'city.region.country'])
            ->withCount('members');

        if ($request->category_id) {
            $query->where('category_id', $request->category_id);
        }

        if ($request->status) {
            $query->where('status', $request->status);
        }

        $groups = $query->orderBy('created_at', 'desc')->paginate(15);

        return response()->json([
            'status' => 'success',
            'success' => true,
            'data' => $groups
        ]);
    }

    /**
     * Admin manually provisions a new WhatsApp linking node
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'category_id' => 'required|uuid|exists:categories,id',
            'name' => 'required|string|max:255',
            'whatsapp_url' => 'required|url',
            'max_members' => 'required|integer|min:10|max:1000',
            'status' => 'required|in:active,full,inactive',
        ]);

        $group = CommunityGroup::create($validated);

        return response()->json([
            'status' => 'success',
            'success' => true,
            'message' => 'WhatsApp Cohort created.',
            'data' => $group->load('category')
        ], 201);
    }

    /**
     * Update Community Limits/Links
     */
    public function update(Request $request, CommunityGroup $community): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'whatsapp_url' => 'required|url',
            'max_members' => 'required|integer|min:10|max:1000',
            'status' => 'required|in:active,full,inactive',
        ]);

        // Auto-reopen the group if the admin upgrades the max_members pool
        if ($community->status === 'full' && $validated['max_members'] > $community->current_members) {
            $validated['status'] = 'active';
        }

        $community->update($validated);

        return response()->json([
            'status' => 'success',
            'success' => true,
            'message' => 'Community updated successfully.',
            'data' => $community->load('category')
        ]);
    }

    public function destroy(CommunityGroup $community): JsonResponse
    {
        $community->delete();
        
        return response()->json([
            'status' => 'success',
            'success' => true,
            'message' => 'Community decommissioned.'
        ]);
    }
}
