<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Concerns\AuthorizesPermissions;
use App\Models\User;
use App\Models\Role;
use App\Services\CommunityAssignmentService;
use App\Services\EmailService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;

class AdminUserController extends Controller
{
    use AuthorizesPermissions;

    public function __construct(
        protected EmailService $emailService,
        protected CommunityAssignmentService $communityAssignment,
    ) {}

    public function index(Request $request): JsonResponse
    {
        if ($response = $this->authorizePermission('users.view')) {
            return $response;
        }

        $users = User::with(['role', 'roles', 'category', 'country', 'state', 'city'])
            ->when($request->search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%")
                      ->orWhere('mobile', 'like', "%{$search}%");
                });
            })
            ->when($request->status && $request->status !== 'All', function ($query) use ($request) {
                $query->where('status', $this->normalizeUserStatus($request->status));
            })
            ->when($request->category_id && $request->category_id !== 'All', function ($query) use ($request) {
                $query->where('category_id', $request->category_id);
            })
            ->when($request->country_id, function ($query) use ($request) {
                $query->where('country_id', $request->country_id);
            })
            ->when($request->role_slug, function ($query, $role_slug) {
                $query->where(function ($q) use ($role_slug) {
                    $q->whereHas('role', fn ($r) => $r->where('slug', $role_slug))
                        ->orWhereHas('roles', fn ($r) => $r->where('slug', $role_slug));
                });
            })
            ->orderBy($request->sort_by ?? 'created_at', $request->order ?? 'desc')
            ->paginate((int) $request->get('limit', 10));

        $users->getCollection()->transform(fn (User $user) => $this->formatUser($user));

        return response()->json([
            'status' => 'success',
            'success' => true,
            'data' => $users,
        ]);
    }

    public function show(User $user): JsonResponse
    {
        if ($response = $this->authorizePermission('users.view')) {
            return $response;
        }

        $user->load(['role', 'roles', 'category', 'country', 'state', 'city', 'communities', 'profile']);

        return response()->json([
            'status' => 'success',
            'success' => true,
            'data' => $this->formatUser($user),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        if ($response = $this->authorizePermission('users.create')) {
            return $response;
        }

        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'full_name' => 'nullable|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email',
            'mobile' => ['nullable', 'string', 'max:16', 'regex:/^(\+91[6-9]\d{9}|[6-9]\d{9}|\+[1-9]\d{6,14})$/'],
            'mobile_number' => ['nullable', 'string', 'max:16', 'regex:/^(\+91[6-9]\d{9}|[6-9]\d{9}|\+[1-9]\d{6,14})$/'],
            'password' => 'nullable|string|min:8|confirmed',
            'role_id' => 'nullable|uuid|exists:roles,id',
            'role_ids' => 'nullable|array',
            'role_ids.*' => 'uuid|exists:roles,id',
            'category_id' => 'nullable|uuid|exists:categories,id',
            'country_id' => 'nullable|exists:countries,id',
            'region_id' => 'nullable|exists:regions,id',
            'state_id' => 'nullable|exists:regions,id',
            'city_id' => 'nullable|exists:cities,id',
            'status' => 'nullable|string|in:active,pending,suspended,inactive',
        ]);

        $name = $validated['full_name'] ?? $validated['name'] ?? null;
        if (!$name) {
            return response()->json([
                'status' => 'error',
                'message' => 'The full name field is required.',
                'errors' => ['full_name' => ['The full name field is required.']],
            ], 422);
        }

        $mobile = $validated['mobile_number'] ?? $validated['mobile'] ?? null;
        $roleId = $validated['role_id'] ?? Role::where('slug', 'user')->value('id');
        if (! $roleId) {
            return response()->json([
                'status' => 'error',
                'message' => 'Default Member role is missing. Run RolePermissionSeeder.',
                'errors' => ['role_id' => ['Default Member role is missing.']],
            ], 422);
        }

        $adminSetPassword = ! empty($validated['password']);
        $plainPassword = $adminSetPassword ? $validated['password'] : Str::password(32);

        $user = User::create([
            'name' => $name,
            'email' => $validated['email'],
            'mobile' => $mobile,
            'category_id' => $validated['category_id'] ?? null,
            'country_id' => $validated['country_id'] ?? null,
            'region_id' => isset($validated['country_id']) ? $this->resolveStateId($validated) : null,
            'city_id' => $validated['city_id'] ?? null,
            'status' => $this->normalizeUserStatus($validated['status'] ?? 'active'),
            'password' => Hash::make($plainPassword),
            'role_id' => $roleId,
            'is_verified' => true,
        ]);

        $this->syncUserRoles($user, $validated['role_ids'] ?? [$roleId]);

        Cache::forget('admin_dashboard_metrics');

        if (! $adminSetPassword) {
            try {
                Password::sendResetLink(['email' => $user->email]);
            } catch (\Exception $e) {
                Log::error('Password setup email failed for user ' . $user->email . ': ' . $e->getMessage());
            }
        }

        if ($user->category_id && $user->city_id) {
            try {
                $this->communityAssignment->autoAssign($user);
                $this->emailService->sendWelcomeEmail($user->fresh());
            } catch (\Exception $e) {
                Log::error('Welcome email dispatch failed for user ' . $user->email . ': ' . $e->getMessage());
            }
        }

        return response()->json([
            'status' => 'success',
            'success' => true,
            'message' => $adminSetPassword
                ? 'User added successfully.'
                : 'User added. A password setup link was sent to their email.',
            'data' => $this->formatUser($user->fresh(['role', 'roles', 'category', 'country', 'state', 'city'])),
        ], 201);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        if ($response = $this->authorizePermission('users.edit')) {
            return $response;
        }

        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'full_name' => 'nullable|string|max:255',
            'email' => 'nullable|string|email|max:255|unique:users,email,' . $user->id,
            'mobile' => ['nullable', 'string', 'max:16', 'regex:/^(\+91[6-9]\d{9}|[6-9]\d{9}|\+[1-9]\d{6,14})$/'],
            'mobile_number' => ['nullable', 'string', 'max:16', 'regex:/^(\+91[6-9]\d{9}|[6-9]\d{9}|\+[1-9]\d{6,14})$/'],
            'password' => 'nullable|string|min:8|confirmed',
            'role_id' => 'nullable|uuid|exists:roles,id',
            'role_ids' => 'nullable|array',
            'role_ids.*' => 'uuid|exists:roles,id',
            'category_id' => 'nullable|uuid|exists:categories,id',
            'country_id' => 'nullable|exists:countries,id',
            'state_id' => 'nullable|exists:regions,id',
            'region_id' => 'nullable|exists:regions,id',
            'city_id' => 'nullable|exists:cities,id',
            'status' => 'nullable|string|in:active,pending,suspended,inactive',
        ]);

        if (isset($validated['full_name'])) {
            $validated['name'] = $validated['full_name'];
            unset($validated['full_name']);
        }
        if (isset($validated['mobile_number'])) {
            $validated['mobile'] = $validated['mobile_number'];
            unset($validated['mobile_number']);
        }

        if (array_key_exists('state_id', $validated) || array_key_exists('region_id', $validated)) {
            $validated['region_id'] = $this->resolveStateId($validated);
        }
        unset($validated['state_id']);

        if ($user->email === 'admin@healernet.org' && (isset($validated['role_id']) || isset($validated['role_ids']))) {
            return response()->json([
                'status' => 'error',
                'message' => 'Cannot modify Super Admin privileges.',
            ], 403);
        }

        if (!empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        $roleIds = $validated['role_ids'] ?? null;
        unset($validated['role_ids']);

        if ($roleIds !== null) {
            $validated['role_id'] = $roleIds[0] ?? $validated['role_id'] ?? $user->role_id;
        } elseif (isset($validated['role_id'])) {
            $roleIds = [$validated['role_id']];
        }

        if (isset($validated['status'])) {
            $validated['status'] = $this->normalizeUserStatus($validated['status']);
        }

        $user->update(array_filter($validated, fn ($value) => !is_null($value)));

        if ($roleIds !== null) {
            $this->syncUserRoles($user, $roleIds);
        }

        return response()->json([
            'status' => 'success',
            'success' => true,
            'message' => 'User profile updated successfully.',
            'data' => $this->formatUser($user->fresh(['role', 'roles', 'category', 'country', 'state', 'city'])),
        ]);
    }

    public function bulkAction(Request $request): JsonResponse
    {
        if ($response = $this->authorizePermission('users.delete')) {
            return $response;
        }

        $validated = $request->validate([
            'action' => 'required|in:delete,suspend',
            'user_ids' => 'required|array',
            'user_ids.*' => 'integer|exists:users,id',
        ]);

        $users = User::whereIn('id', $validated['user_ids'])->get();

        foreach ($users as $user) {
            if ($user->email === 'admin@healernet.org') {
                continue;
            }

            if ($validated['action'] === 'delete') {
                $user->tokens()->delete();
                $user->delete();
            } elseif ($validated['action'] === 'suspend') {
                $user->update(['status' => 'suspended']);
                $user->tokens()->delete();
            }
        }

        return response()->json([
            'status' => 'success',
            'success' => true,
            'message' => "Bulk {$validated['action']} executed successfully.",
        ]);
    }

    public function destroy(User $user): JsonResponse
    {
        if ($response = $this->authorizePermission('users.delete')) {
            return $response;
        }

        if ($user->email === 'admin@healernet.org') {
            return response()->json(['status' => 'error', 'message' => 'Cannot delete Super Admin.'], 403);
        }

        $user->tokens()->delete();
        $user->delete();

        return response()->json([
            'status' => 'success',
            'success' => true,
            'message' => 'User deleted successfully.',
        ]);
    }

    private function syncUserRoles(User $user, array $roleIds): void
    {
        $roles = Role::whereIn('id', array_values(array_unique($roleIds)))->get();
        $user->syncRoles($roles);

        if ($roles->isNotEmpty()) {
            $user->forceFill(['role_id' => $roles->first()->id])->saveQuietly();
        }
    }

    private function formatUser(User $user): array
    {
        $data = $user->toArray();
        $data['role_ids'] = $user->roles->pluck('id')->values()->all();
        $data['role_names'] = $user->roles->pluck('name')->values()->all();

        return $data;
    }

    private function resolveStateId(array $validated): ?int
    {
        $stateId = $validated['state_id'] ?? $validated['region_id'] ?? null;

        return $stateId !== null ? (int) $stateId : null;
    }

    private function normalizeUserStatus(?string $status): string
    {
        $normalized = strtolower(trim((string) ($status ?: 'active')));

        // UI uses "Inactive"; DB enum is active|suspended|pending
        return $normalized === 'inactive' ? 'suspended' : $normalized;
    }
}
