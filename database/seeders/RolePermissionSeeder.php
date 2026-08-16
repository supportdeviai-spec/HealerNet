<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Support\PermissionCatalog;
use Illuminate\Database\Seeder;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        $this->seedPermissions();
        $this->seedRoles();
        $this->assignDefaultRolePermissions();
        $this->syncUsersToSpatieRoles();
    }

    private function seedPermissions(): void
    {
        $validNames = PermissionCatalog::allSlugs();

        foreach (PermissionCatalog::groups() as $groupKey => $group) {
            foreach ($group['permissions'] as $slug => $label) {
                Permission::query()->updateOrCreate(
                    ['name' => $slug, 'guard_name' => PermissionCatalog::GUARD],
                    [
                        'slug' => str_replace('.', '-', $slug),
                        'group' => $groupKey,
                    ]
                );
            }
        }

        // Drop obsolete catalog permissions (e.g. community-groups.create → Group Management)
        Permission::query()
            ->where('guard_name', PermissionCatalog::GUARD)
            ->whereNotIn('name', $validNames)
            ->each(function (Permission $permission) {
                $permission->roles()->detach();
                $permission->delete();
            });
    }

    private function seedRoles(): void
    {
        $roles = [
            ['name' => 'Super Admin', 'slug' => 'admin', 'is_system' => true],
            ['name' => 'Member', 'slug' => 'user', 'is_system' => true],
            ['name' => 'Practitioner', 'slug' => 'practitioner', 'is_system' => true],
            ['name' => 'Doctor', 'slug' => 'doctor', 'is_system' => false],
            ['name' => 'Moderator', 'slug' => 'moderator', 'is_system' => false],
            ['name' => 'Content Manager', 'slug' => 'content_manager', 'is_system' => false],
            ['name' => 'Support', 'slug' => 'support', 'is_system' => false],
            ['name' => 'Viewer', 'slug' => 'viewer', 'is_system' => false],
        ];

        foreach ($roles as $roleData) {
            Role::query()->updateOrCreate(
                ['slug' => $roleData['slug']],
                [
                    'name' => $roleData['name'],
                    'guard_name' => PermissionCatalog::GUARD,
                    'is_system' => $roleData['is_system'],
                ]
            );
        }
    }

    private function assignDefaultRolePermissions(): void
    {
        $adminRole = Role::where('slug', 'admin')->first();
        if ($adminRole) {
            $adminRole->syncPermissions(Permission::all());
        }

        foreach (PermissionCatalog::defaultRolePermissions() as $roleSlug => $permissionSlugs) {
            $role = Role::where('slug', $roleSlug)->first();
            if (!$role) {
                continue;
            }

            $permissions = Permission::whereIn('name', $permissionSlugs)->get();
            $role->syncPermissions($permissions);
        }
    }

    private function syncUsersToSpatieRoles(): void
    {
        User::query()->whereNotNull('role_id')->chunkById(100, function ($users) {
            foreach ($users as $user) {
                $role = Role::find($user->role_id);
                if ($role) {
                    $user->syncRoles([$role]);
                }
            }
        });

        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
