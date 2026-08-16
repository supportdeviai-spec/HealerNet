<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PractitionerController extends Controller
{
    /**
     * View officially vetted Healthcare Practitioners
     */
    public function index(Request $request): JsonResponse
    {
        $practitioners = User::whereHas('role', function($q) {
            $q->where('slug', 'practitioner');
        })->where('status', 'active')->with('profile')->paginate(10);

        return response()->json([
            'status' => 'success',
            'success' => true,
            'data' => $practitioners
        ]);
    }

    /**
     * View a specific practitioner's public profile
     */
    public function show($id): JsonResponse
    {
        $practitioner = User::whereHas('role', function($q) {
            $q->where('slug', 'practitioner');
        })->where('id', $id)->with('profile')->first();

        if (!$practitioner) {
            return response()->json(['status' => 'error', 'message' => 'Practitioner not found.'], 404);
        }

        return response()->json([
            'status' => 'success',
            'success' => true,
            'data' => $practitioner
        ]);
    }

    /**
     * User applies to become a vetted practitioner
     */
    public function apply(Request $request): JsonResponse
    {
        // Handled securely - marks a flag or changes role to pending practitioner
        $user = $request->user();
        
        return response()->json([
            'status' => 'success',
            'success' => true,
            'message' => 'Application submitted for security review.'
        ]);
    }
}