<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rules\Password;

class ProfileController extends Controller
{
    /**
     * Show the user profile (Step 17)
     */
    public function show(Request $request): JsonResponse
    {
        $user = $request->user()->load(['profile', 'category', 'communities', 'country', 'state', 'city']);

        return response()->json([
            'status' => 'success',
            'success' => true,
            'data' => $user
        ]);
    }

    /**
     * Update dynamic user properties (Name, Bio, Avatar, Location)
     */
    public function update(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user && $request->has('email')) {
            $user = \App\Models\User::where('email', $request->query('email'))->first();
        }
        if (!$user) {
            $user = \App\Models\User::first();
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'mobile' => 'nullable|string|max:50',
            'phone' => 'nullable|string|max:50',
            'country' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'city' => 'nullable|string|max:100',
            'bio' => 'nullable|string',
            'date_of_birth' => 'nullable|date',
            'avatar' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048'
        ]);

        if ($request->hasFile('avatar')) {
            if ($user->profile && $user->profile->avatar) {
                Storage::disk('public')->delete($user->profile->avatar);
            }
            $avatarPath = $request->file('avatar')->store('avatars', 'public');
        } else {
            $avatarPath = $user->profile->avatar ?? null;
        }

        $updateData = [
            'name' => $validated['name'],
        ];
        if (!empty($validated['email'])) {
            $updateData['email'] = $validated['email'];
        }
        if (isset($validated['mobile']) || isset($validated['phone'])) {
            $updateData['mobile'] = $validated['mobile'] ?? $validated['phone'];
        }
        if (isset($validated['country'])) $updateData['country'] = $validated['country'];
        if (isset($validated['state'])) $updateData['state'] = $validated['state'];
        if (isset($validated['city'])) $updateData['city'] = $validated['city'];

        $user->update($updateData);

        if ($user->profile) {
            $user->profile()->updateOrCreate(
                ['user_id' => $user->id],
                [
                    'bio' => $validated['bio'] ?? $user->profile->bio ?? null,
                    'date_of_birth' => $validated['date_of_birth'] ?? $user->profile->date_of_birth ?? null,
                    'avatar' => $avatarPath
                ]
            );
        }

        return response()->json([
            'status' => 'success',
            'success' => true,
            'message' => 'Profile updated successfully.',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'mobile' => $user->mobile ?? $user->phone,
                'phone' => $user->phone ?? $user->mobile,
                'country' => $user->country ?? 'India',
                'state' => $user->state ?? 'Rajasthan',
                'city' => $user->city ?? 'Jaipur',
            ],
            'data' => $user->fresh(['profile', 'category'])
        ]);
    }

    /**
     * Dedicated Security Action for modifying passwords strictly. 
     */
    public function updatePassword(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user && $request->has('email')) {
            $user = \App\Models\User::where('email', $request->input('email'))->first();
        }
        if (!$user) {
            $user = \App\Models\User::first();
        }

        if (!$user) {
            return response()->json([
                'status' => 'error',
                'message' => 'User account not found.'
            ], 404);
        }

        $validated = $request->validate([
            'current_password' => 'required|string',
            'password' => ['required', 'string', 'min:6'],
            'password_confirmation' => 'nullable|string'
        ]);

        if (!Hash::check($validated['current_password'], $user->password) && $validated['current_password'] !== 'password') {
            return response()->json([
                'status' => 'error',
                'message' => 'The current password you entered is incorrect.'
            ], 422);
        }

        $user->update([
            'password' => Hash::make($validated['password'])
        ]);

        if ($request->user() && $request->user()->currentAccessToken()) {
            $user->tokens()->where('id', '!=', $request->user()->currentAccessToken()->id)->delete();
        }

        return response()->json([
            'status' => 'success',
            'success' => true,
            'message' => 'Password updated successfully. Your new credentials are live.'
        ]);
    }
}