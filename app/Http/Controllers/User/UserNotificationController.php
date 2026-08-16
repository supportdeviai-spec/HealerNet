<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserNotificationController extends Controller
{
    /**
     * Fetch User's Notifications (Step 14)
     * Leveraging Laravel's native DatabaseNotification system natively attached to the User Model.
     */
    public function index(Request $request): JsonResponse
    {
        // Fetches notifications natively bound via standard Laravel NOTIFIABLE trait
        $notifications = $request->user()->notifications()->paginate(15);
        $unreadCount = $request->user()->unreadNotifications()->count();

        return response()->json([
            'status' => 'success',
            'success' => true,
            'data' => [
                'notifications' => $notifications,
                'unread_count' => $unreadCount
            ]
        ]);
    }

    /**
     * Mark single notification as read
     */
    public function markAsRead(Request $request, $id): JsonResponse
    {
        $notification = $request->user()->notifications()->where('id', $id)->first();
        
        if ($notification) {
            $notification->markAsRead();
        }

        return response()->json([
            'status' => 'success',
            'success' => true,
            'message' => 'Notification marked as read.'
        ]);
    }

    /**
     * Mark entire inbox strictly as read
     */
    public function markAllAsRead(Request $request): JsonResponse
    {
        $request->user()->unreadNotifications->markAsRead();

        return response()->json([
            'status' => 'success',
            'success' => true,
            'message' => 'All notifications cleared.'
        ]);
    }
}
