<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Services\LocationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WhatsAppCommunityController extends Controller
{
    use RespondsWithJson;

    public function __construct(private readonly LocationService $locationService)
    {
    }

    /**
     * Return all active community groups for a city.
     */
    public function cityGroups(Request $request): JsonResponse
    {
        $cityId = $request->query('city_id');
        if (!$cityId) {
            return $this->errorResponse('city_id is required.', null, 422);
        }

        $groups = $this->locationService->listCommunityGroupsForPublic((int) $cityId);

        return $this->successResponse('Community groups fetched successfully.', $groups);
    }

    /**
     * Legacy single-match endpoint kept for backward compatibility.
     */
    public function matchCommunity(Request $request): JsonResponse
    {
        $cityId = $request->query('city_id');

        if ($cityId) {
            $groups = $this->locationService->listCommunityGroupsForPublic((int) $cityId);
            $community = $groups->first();

            if ($community) {
                return response()->json([
                    'status' => 'success',
                    'success' => true,
                    'community' => [
                        'id' => $community['id'] ?? null,
                        'name' => $community['name'] ?? null,
                        'whatsapp_link' => $community['whatsapp_url'] ?? null,
                        'whatsapp_url' => $community['whatsapp_url'] ?? null,
                    ],
                    'community_groups' => $groups,
                ]);
            }
        }

        return response()->json([
            'status' => 'success',
            'success' => true,
            'community' => null,
            'message' => "We couldn't find a WhatsApp community for your location yet.",
        ]);
    }
}
