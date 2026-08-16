<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminPractitionerController extends Controller
{
    /**
     * View all practitioners pending approval
     */
    public function index(Request $request): JsonResponse
    {
        $practitioners = User::whereHas('role', function($q) {
            $q->where('slug', 'practitioner');
        })->with('profile')->paginate(20);

        return response()->json([
            'status' => 'success',
            'success' => true,
            'data' => $practitioners
        ]);
    }

    /**
     * Approve a practitioner's credentials securely
     */
    public function approve(Request $request, User $user): JsonResponse
    {
        $user->update(['status' => 'active']);

        return response()->json([
            'status' => 'success',
            'success' => true,
            'message' => 'Practitioner approved and activated on the network.'
        ]);
    }
}
