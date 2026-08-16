<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Concerns\AuthorizesPermissions;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Support\PermissionCatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AdminRoleController extends Controller
{
    use AuthorizesPermissions;

    public function permissions(): JsonResponse
    {
        if ($response = $this->authorizePermission('permissions.view')) {
            return $response;
        }

        return response()->json([
            'status' => 'success',
            'data' => $this->groupedPermissions(),
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        if ($response = $this->authorizePermission('roles.view')) {
            return $response;
        }

        $query = Role::query()
            ->withCount('permissions')
            ->orderBy('name');

        if ($search = trim((string) $request->get('search', ''))) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhere('slug', 'like', "%{$search}%");
            });
        }

        if ($status = $request->get('status')) {
            if (strtolower((string) $status) !== 'all') {
                $query->where('status', strtolower((string) $status));
            }
        }

        $roles = $query->paginate((int) $request->get('limit', 15));

        $roles->getCollection()->transform(function (Role $role) {
            return $this->formatRole($role, true);
        });

        return response()->json([
            'status' => 'success',
            'data' => $roles,
        ]);
    }

    public function show(Role $role): JsonResponse
    {
        if ($response = $this->authorizePermission('roles.view')) {
            return $response;
        }

        $role->loadCount('permissions');

        return response()->json([
            'status' => 'success',
            'data' => $this->formatRole($role, true),
        ]);
    }

    public function rolePermissions(Role $role): JsonResponse
    {
        if ($response = $this->authorizePermission('permissions.view')) {
            return $response;
        }

        return response()->json([
            'status' => 'success',
            'data' => [
                'role' => $this->formatRole($role->loadCount('permissions'), true),
                'permission_slugs' => $role->permissions->pluck('name')->values(),
                'groups' => $this->groupedPermissions(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        if ($response = $this->authorizePermission('roles.create')) {
            return $response;
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:roles,name',
            'description' => 'nullable|string|max:2000',
            'status' => 'nullable|string|in:active,inactive',
        ]);

        $slug = Str::slug($validated['name']);
        if (Role::where('slug', $slug)->exists()) {
            $slug .= '-' . Str::lower(Str::random(4));
        }

        $role = Role::create([
            'name' => trim($validated['name']),
            'slug' => $slug,
            'description' => $validated['description'] ?? null,
            'status' => strtolower($validated['status'] ?? 'active'),
            'guard_name' => PermissionCatalog::GUARD,
            'is_system' => false,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Role created successfully.',
            'data' => $this->formatRole($role->fresh()->loadCount('permissions'), true),
        ], 201);
    }

    public function update(Request $request, Role $role): JsonResponse
    {
        if ($response = $this->authorizePermission('roles.edit')) {
            return $response;
        }

        if ($role->isSuperAdmin()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Super Admin role metadata cannot be modified.',
            ], 403);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('roles', 'name')->ignore($role->id)],
            'description' => 'nullable|string|max:2000',
            'status' => 'nullable|string|in:active,inactive',
        ]);

        $role->update([
            'name' => trim($validated['name']),
            'description' => $validated['description'] ?? null,
            'status' => strtolower($validated['status'] ?? $role->status ?? 'active'),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Role updated successfully.',
            'data' => $this->formatRole($role->fresh()->loadCount('permissions'), true),
        ]);
    }

    public function updatePermissions(Request $request, Role $role): JsonResponse
    {
        if ($response = $this->authorizePermission('permissions.assign')) {
            return $response;
        }

        if ($role->isSuperAdmin()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Super Admin permissions cannot be modified.',
            ], 403);
        }

        $validated = $request->validate([
            'permission_slugs' => 'required|array',
            'permission_slugs.*' => 'string',
        ]);

        $this->syncRolePermissions($role, $validated['permission_slugs']);

        return response()->json([
            'status' => 'success',
            'message' => 'Role permissions updated successfully.',
            'data' => $this->formatRole($role->fresh('permissions')->loadCount('permissions'), true),
        ]);
    }

    public function destroy(Role $role): JsonResponse
    {
        if ($response = $this->authorizePermission('roles.delete')) {
            return $response;
        }

        if ($role->is_system || $role->isSuperAdmin()) {
            return response()->json([
                'status' => 'error',
                'message' => 'System roles cannot be deleted.',
            ], 403);
        }

        if ($this->assignedUserCount($role) > 0) {
            return response()->json([
                'status' => 'error',
                'message' => 'Cannot delete a role that is assigned to users.',
            ], 422);
        }

        $role->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Role deleted successfully.',
        ]);
    }

    private function syncRolePermissions(Role $role, array $permissionSlugs): void
    {
        $filtered = array_values(array_filter(
            $permissionSlugs,
            fn (string $slug) => PermissionCatalog::isValidSlug($slug)
        ));

        $permissions = Permission::whereIn('name', $filtered)->get();
        $role->syncPermissions($permissions);
    }

    private function groupedPermissions(): array
    {
        return collect(PermissionCatalog::groups())->map(function (array $group, string $key) {
            return [
                'key' => $key,
                'label' => $group['label'],
                'permissions' => collect($group['permissions'])->map(fn ($label, $slug) => [
                    'slug' => $slug,
                    'label' => $label,
                ])->values(),
            ];
        })->values()->all();
    }

    private function assignedUserCount(Role $role): int
    {
        $fromPivot = DB::table('model_has_roles')
            ->where('role_id', $role->id)
            ->where('model_type', User::class)
            ->distinct('model_id')
            ->count('model_id');

        $fromLegacy = User::where('role_id', $role->id)->count();

        return max($fromPivot, $fromLegacy);
    }

    private function formatRole(Role $role, bool $includeCounts = false): array
    {
        $payload = [
            'id' => $role->id,
            'name' => $role->name,
            'slug' => $role->slug,
            'description' => $role->description,
            'status' => $role->status ?? 'active',
            'is_system' => (bool) $role->is_system,
            'is_super_admin' => $role->isSuperAdmin(),
            'created_at' => $role->created_at,
            'permissions' => $role->relationLoaded('permissions')
                ? $role->permissions->pluck('name')->values()
                : [],
        ];

        if ($includeCounts) {
            $payload['permission_count'] = (int) ($role->permissions_count ?? $role->permissions()->count());
            $payload['user_count'] = $this->assignedUserCount($role);
        }

        return $payload;
    }
}
