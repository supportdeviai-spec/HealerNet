<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Models\Event;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class UserEventController extends Controller
{
    /**
     * Fetch events restricted ONLY to the user's category (Step 12 Feature)
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $events = Event::withCount('participants')
            ->where('category_id', $user->category_id)
            ->whereIn('status', ['upcoming', 'ongoing'])
            ->orderBy('event_date', 'asc')
            ->get();

        // Map over events to flag if the user is already attending 
        // to render dynamically changing 'Cancel RSVP' / 'Attending' button statuses on React.
        $userEventIds = $user->events()->pluck('events.id')->toArray();

        $events->transform(function ($event) use ($userEventIds) {
            $event->is_attending = in_array($event->id, $userEventIds);
            $event->is_full = $event->participants_count >= $event->max_participants;
            return $event;
        });

        return response()->json([
            'status' => 'success',
            'success' => true,
            'data' => $events
        ]);
    }

    /**
     * RSVP to an event featuring pessimism locks.
     */
    public function register(Request $request, Event $event): JsonResponse
    {
        $user = $request->user();

        // 1. Hyper-targeting check
        if ($event->category_id !== $user->category_id) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized for this category.'], 403);
        }

        // 2. Prevent duplicate registrations safely
        if ($event->participants()->where('user_id', $user->id)->exists()) {
            return response()->json(['status' => 'success', 'message' => 'You are already registered!']);
        }

        // 3. Database Pessimistic Lock to ensure 100 max capacity is fiercely respected
        try {
            DB::transaction(function () use ($event, $user) {
                $lockedEvent = Event::lockForUpdate()->find($event->id);
                $currentCount = $lockedEvent->participants()->count();
                
                if ($currentCount >= $lockedEvent->max_participants) {
                    abort(422, 'This event has reached full capacity.');
                }
        
                $lockedEvent->participants()->attach($user->id, [
                    'registered_at' => now()
                ]);
            });

            return response()->json(['status' => 'success', 'success' => true, 'message' => 'Registration confirmed!']);
        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 422);
        }
    }

    /**
     * Cancel RSVP freeing up a slot immediately
     */
    public function cancel(Request $request, Event $event): JsonResponse
    {
        $user = $request->user();
        
        if ($event->category_id !== $user->category_id) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized.'], 403);
        }

        $event->participants()->detach($user->id);

        return response()->json(['status' => 'success', 'success' => true, 'message' => 'RSVP cancelled successfully.']);
    }
}
