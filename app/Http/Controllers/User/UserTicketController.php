<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Models\SupportTicket;
use App\Models\TicketMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserTicketController extends Controller
{
    /**
     * Get isolated view of the user's personal tickets (Step 16)
     */
    public function index(Request $request): JsonResponse
    {
        $tickets = SupportTicket::where('user_id', $request->user()->id)
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        return response()->json([
            'status' => 'success',
            'success' => true,
            'data' => $tickets
        ]);
    }

    /**
     * User initiates a new Support Thread
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'subject' => 'required|string|max:255',
            'priority' => 'required|in:low,medium,high',
            'description' => 'required|string|min:10'
        ]);

        $ticket = SupportTicket::create([
            'user_id' => $request->user()->id,
            'subject' => $validated['subject'],
            'priority' => $validated['priority'],
            'description' => $validated['description'],
            'status' => 'open'
        ]);

        return response()->json([
            'status' => 'success',
            'success' => true,
            'message' => 'Your support ticket has been submitted successfully.',
            'data' => $ticket
        ], 201);
    }

    /**
     * Fetch a specific ticket belonging to the user
     */
    public function show(Request $request, SupportTicket $ticket): JsonResponse
    {
        // Authorization check to guarantee users cannot view others' tickets via UUID scanning
        if ($ticket->user_id !== $request->user()->id) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized access.'], 403);
        }

        $ticket->load(['messages.user']);

        return response()->json([
            'status' => 'success',
            'success' => true,
            'data' => $ticket
        ]);
    }

    /**
     * User replies back in an ongoing thread
     */
    public function reply(Request $request, SupportTicket $ticket): JsonResponse
    {
        if ($ticket->user_id !== $request->user()->id) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized action.'], 403);
        }
        
        if (in_array($ticket->status, ['resolved', 'closed'])) {
            return response()->json(['status' => 'error', 'message' => 'Cannot reply to a closed ticket.'], 403);
        }

        $validated = $request->validate([
            'message' => 'required|string|min:2'
        ]);

        $message = TicketMessage::create([
            'support_ticket_id' => $ticket->id,
            'user_id' => $request->user()->id, 
            'message' => $validated['message']
        ]);

        return response()->json([
            'status' => 'success',
            'success' => true,
            'message' => 'Message sent successfully.',
            'data' => $message->load('user')
        ], 201);
    }
}
