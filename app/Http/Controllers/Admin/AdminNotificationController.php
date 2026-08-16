<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Jobs\BroadcastAnnouncementEmailJob;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class AdminNotificationController extends Controller
{
    public function inbox(Request $request): JsonResponse
    {
        $admin = $request->user();
        $notifications = $admin->notifications()->latest()->limit(30)->get();

        return response()->json([
            'status' => 'success',
            'unread_count' => $admin->unreadNotifications()->count(),
            'data' => $notifications->map(fn ($notification) => $this->formatNotification($notification)),
        ]);
    }

    public function markRead(Request $request, string $id): JsonResponse
    {
        $notification = $request->user()->notifications()->where('id', $id)->first();

        if (!$notification) {
            return response()->json([
                'status' => 'error',
                'message' => 'Notification not found.',
            ], 404);
        }

        if (!$notification->read_at) {
            $notification->markAsRead();
        }

        return response()->json([
            'status' => 'success',
            'unread_count' => $request->user()->unreadNotifications()->count(),
        ]);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $request->user()->unreadNotifications->markAsRead();

        return response()->json([
            'status' => 'success',
            'unread_count' => 0,
            'message' => 'All notifications marked as read.',
        ]);
    }

    public function recipientCount(): JsonResponse
    {
        $count = $this->eligibleUsersQuery()->count();

        return response()->json([
            'status' => 'success',
            'count' => $count,
        ]);
    }

    public function emailAll(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'subject' => 'required|string|max:255',
            'message' => 'required|string|min:10|max:10000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation error.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $count = $this->eligibleUsersQuery()->count();

        if ($count === 0) {
            return response()->json([
                'status' => 'error',
                'message' => 'No active users with email addresses found.',
            ], 422);
        }

        $subject = trim($request->input('subject'));
        $message = trim($request->input('message'));

        BroadcastAnnouncementEmailJob::dispatch($subject, $message);

        return response()->json([
            'status' => 'success',
            'message' => "Announcement queued for {$count} users.",
            'recipient_count' => $count,
        ]);
    }

    private function formatNotification($notification): array
    {
        $data = is_array($notification->data) ? $notification->data : [];

        return [
            'id' => $notification->id,
            'type' => $data['type'] ?? 'info',
            'title' => $data['title'] ?? 'Notification',
            'body' => $data['body'] ?? $data['message'] ?? '',
            'link_section' => $data['link_section'] ?? null,
            'read_at' => $notification->read_at,
            'created_at' => $notification->created_at,
            'time_ago' => $notification->created_at?->diffForHumans(),
        ];
    }

    private function eligibleUsersQuery()
    {
        return User::query()
            ->whereNotNull('email')
            ->where('email', '!=', '')
            ->where('status', 'active');
    }
}
