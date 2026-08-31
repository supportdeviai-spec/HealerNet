<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Models\User;
use App\Services\CommunityAssignmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserCommunityController extends Controller
{
    use RespondsWithJson;

    public function __construct(private readonly CommunityAssignmentService $communityAssignment)
    {
    }

    public function categoryGroups(Request $request): JsonResponse
    {
        /** @var User|null $user */
        $user = $request->user();
        if (!$user) {
            return $this->errorResponse('Unauthenticated.', 401);
        }

        $user->loadMissing('categories');

        $rows = $this->communityAssignment->findGroupsForUserCategories($user)
            ->map(fn (array $row) => [
                'category_id' => $row['category_id'],
                'category_name' => $row['category_name'],
                'status' => $row['status'],
                'message' => $row['message'] ?? null,
                'id' => $row['group_id'] ?? null,
                'name' => $row['group_name'] ?? null,
                'description' => $row['description'] ?? null,
                'whatsapp_url' => $row['whatsapp_url'] ?? null,
            ])
            ->values();

        return $this->successResponse('Category community groups fetched successfully.', $rows);
    }
}
