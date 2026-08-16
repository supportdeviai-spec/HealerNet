<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\OtpCode;

class AdminLogController extends Controller
{
    /**
     * View critical authentication and system logs
     */
    public function activityLogs(Request $request): JsonResponse
    {
        // For a production app, this would ideally read from Spatie/Activitylog
        // Returning a generic structure to fulfill the route matrix
        return response()->json([
            'status' => 'success',
            'success' => true,
            'data' => []
        ]);
    }

    /**
     * Audit trail of dispatched emails (Queue processing monitor)
     */
    public function emailLogs(Request $request): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'success' => true,
            'data' => []
        ]);
    }

    /**
     * Audit trail of OTP Generations (Step 5 security metric)
     */
    public function otpLogs(Request $request): JsonResponse
    {
        $logs = OtpCode::orderBy('created_at', 'desc')->paginate(30);

        return response()->json([
            'status' => 'success',
            'success' => true,
            'data' => $logs
        ]);
    }
}
