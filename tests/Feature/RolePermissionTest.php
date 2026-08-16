<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use App\Support\PermissionCatalog;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RolePermissionTest extends TestCase
{
    use RefreshDatabase;

    protected function createAdmin(): User
    {
        $this->seed(RolePermissionSeeder::class);

        $role = Role::where('slug', 'admin')->firstOrFail();
        $user = User::factory()->create(['role_id' => $role->id]);
        $user->syncRoles([$role]);

        return $user;
    }

    public function test_admin_can_list_permissions_and_roles(): void
    {
        Sanctum::actingAs($this->createAdmin());

        $this->getJson('/api/admin/permissions')
            ->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonStructure(['data' => [['key', 'label', 'permissions']]]);

        $this->getJson('/api/admin/roles')
            ->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonFragment(['slug' => 'admin']);
    }

    public function test_admin_can_create_role_and_update_metadata(): void
    {
        Sanctum::actingAs($this->createAdmin());

        $create = $this->postJson('/api/admin/roles', [
            'name' => 'Regional Manager',
            'description' => 'Manages regional communities',
            'status' => 'active',
        ]);

        $create->assertCreated()->assertJsonPath('status', 'success');
        $roleId = $create->json('data.id');

        $this->putJson("/api/admin/roles/{$roleId}", [
            'name' => 'Regional Manager',
            'description' => 'Updated description',
            'status' => 'active',
        ])->assertOk()->assertJsonPath('data.description', 'Updated description');
    }

    public function test_admin_can_sync_role_permissions(): void
    {
        Sanctum::actingAs($this->createAdmin());

        $create = $this->postJson('/api/admin/roles', [
            'name' => 'Community Manager',
            'status' => 'active',
        ]);

        $roleId = $create->json('data.id');

        $this->putJson("/api/admin/roles/{$roleId}/permissions", [
            'permission_slugs' => ['access_admin', 'dashboard.view', 'users.view', 'users.edit'],
        ])->assertOk()->assertJsonFragment(['users.edit']);
    }

    public function test_member_without_access_admin_cannot_open_admin_panel(): void
    {
        $this->seed(RolePermissionSeeder::class);

        $memberRole = Role::where('slug', 'user')->firstOrFail();
        $member = User::factory()->create(['role_id' => $memberRole->id]);
        $member->syncRoles([$memberRole]);

        Sanctum::actingAs($member);

        $this->getJson('/api/admin/roles')->assertForbidden();
    }

    public function test_viewer_can_list_users_but_not_create(): void
    {
        $this->seed(RolePermissionSeeder::class);

        $viewerRole = Role::where('slug', 'viewer')->firstOrFail();
        $staff = User::factory()->create(['role_id' => $viewerRole->id]);
        $staff->syncRoles([$viewerRole]);

        Sanctum::actingAs($staff);

        $this->getJson('/api/admin/users')->assertOk();
        $this->postJson('/api/admin/users', [
            'full_name' => 'Test',
            'email' => 'test@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role_id' => $viewerRole->id,
        ])->assertForbidden();
    }

    public function test_auth_me_includes_permissions_for_staff(): void
    {
        $this->seed(RolePermissionSeeder::class);

        $viewerRole = Role::where('slug', 'viewer')->firstOrFail();
        $staff = User::factory()->create(['role_id' => $viewerRole->id]);
        $staff->syncRoles([$viewerRole]);

        Sanctum::actingAs($staff);

        $response = $this->getJson('/api/auth/me');

        $response->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonStructure(['user', 'permissions']);

        $permissions = $response->json('permissions');
        $this->assertContains('access_admin', $permissions);
        $this->assertContains('users.view', $permissions);
        $this->assertNotContains('users.delete', $permissions);
    }

    public function test_super_admin_permissions_cannot_be_modified(): void
    {
        Sanctum::actingAs($this->createAdmin());

        $adminRole = Role::where('slug', 'admin')->firstOrFail();

        $this->putJson("/api/admin/roles/{$adminRole->id}/permissions", [
            'permission_slugs' => ['dashboard.view'],
        ])->assertForbidden();
    }

    public function test_permission_catalog_uses_edit_naming(): void
    {
        $slugs = PermissionCatalog::allSlugs();

        $this->assertContains('users.edit', $slugs);
        $this->assertContains('countries.edit', $slugs);
        $this->assertContains('permissions.assign', $slugs);
        $this->assertNotContains('users.update', $slugs);
    }

    public function test_admin_can_create_user_with_role_assignment(): void
    {
        Sanctum::actingAs($this->createAdmin());

        $staffRole = Role::where('slug', 'viewer')->firstOrFail();

        $response = $this->postJson('/api/admin/users', [
            'full_name' => 'John Doe',
            'email' => 'john.doe@healernet.test',
            'password' => 'SecurePass123!',
            'password_confirmation' => 'SecurePass123!',
            'role_id' => $staffRole->id,
            'status' => 'active',
        ]);

        $response->assertCreated()->assertJsonPath('status', 'success');

        $user = User::where('email', 'john.doe@healernet.test')->first();
        $this->assertNotNull($user);
        $this->assertTrue($user->hasRole($staffRole));
    }

    public function test_admin_can_create_user_without_password_and_sends_setup_link(): void
    {
        Sanctum::actingAs($this->createAdmin());

        $response = $this->postJson('/api/admin/users', [
            'full_name' => 'No Password User',
            'email' => 'nopassword@healernet.test',
            'status' => 'active',
        ]);

        $response->assertCreated()
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('message', 'User added. A password setup link was sent to their email.');

        $user = User::where('email', 'nopassword@healernet.test')->first();
        $this->assertNotNull($user);
        $this->assertTrue(
            $user->hasRole('Member') || $user->roles->contains(fn ($role) => $role->slug === 'user'),
            'Expected default Member (slug: user) role'
        );
    }
}
