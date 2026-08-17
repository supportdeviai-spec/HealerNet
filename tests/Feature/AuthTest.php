<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\City;
use App\Models\Country;
use App\Models\OtpCode;
use App\Models\Region;
use App\Models\Role;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Role::create(['name' => 'Member', 'slug' => 'user', 'guard_name' => 'web']);
    }

    private function locationPayload(Category $category): array
    {
        $country = Country::create(['name' => 'India', 'code' => 'IN', 'phone_code' => '+91', 'status' => 'active']);
        $region = Region::create(['country_id' => $country->id, 'name' => 'Maharashtra', 'type' => 'state', 'status' => 'active']);
        $city = City::create(['region_id' => $region->id, 'name' => 'Pune', 'status' => 'active']);

        return [
            'category_id' => $category->id,
            'country_id' => $country->id,
            'region_id' => $region->id,
            'city_id' => $city->id,
        ];
    }

    public function test_registration_blocked_without_verified_otps(): void
    {
        $category = Category::factory()->create(['status' => 'active']);

        $response = $this->postJson('/api/auth/register', array_merge([
            'name' => 'John Doe',
            'email' => 'john@healernet.org',
            'mobile' => '+919876543210',
            'password' => 'SecurePass123!',
        ], $this->locationPayload($category)));

        $response->assertStatus(403);
        $response->assertJsonFragment([
            'message' => 'Email verification is required before completing registration.',
        ]);
    }

    public function test_registration_succeeds_with_verified_otps(): void
    {
        $category = Category::factory()->create(['status' => 'active']);
        $location = $this->locationPayload($category);

        OtpCode::create([
            'email' => 'jane@healernet.org',
            'code' => '1234',
            'type' => 'email',
            'expires_at' => now()->addMinutes(5),
            'used_at' => now(),
        ]);

        $response = $this->postJson('/api/auth/register', array_merge([
            'name' => 'Jane Doe',
            'email' => 'jane@healernet.org',
            'mobile' => '+919876543211',
            'password' => 'SecurePass123!',
        ], $location));

        $response->assertStatus(201);
        $response->assertJsonStructure(['token', 'user']);
    }

    public function test_registration_stores_optional_title_business_name_and_date_of_birth(): void
    {
        $category = Category::factory()->create(['status' => 'active']);
        $location = $this->locationPayload($category);

        OtpCode::create([
            'email' => 'sarah@healernet.org',
            'code' => '4321',
            'type' => 'email',
            'expires_at' => now()->addMinutes(5),
            'used_at' => now(),
        ]);

        $response = $this->postJson('/api/auth/register', array_merge([
            'title' => 'Dr.',
            'name' => 'Sarah Jenkins',
            'business_name' => 'Shanti Wellness Center',
            'date_of_birth' => '1988-04-16',
            'email' => 'sarah@healernet.org',
            'mobile' => '+919876543212',
        ], $location));

        $response->assertStatus(201);

        $this->assertDatabaseHas('users', [
            'email' => 'sarah@healernet.org',
            'title' => 'Dr.',
            'name' => 'Sarah Jenkins',
            'business_name' => 'Shanti Wellness Center',
        ]);

        $user = \App\Models\User::where('email', 'sarah@healernet.org')->first();
        $this->assertNotNull($user);
        $this->assertSame('1988-04-16', $user->profile?->date_of_birth?->format('Y-m-d'));
    }

    public function test_registration_rejects_future_date_of_birth(): void
    {
        $category = Category::factory()->create(['status' => 'active']);
        $location = $this->locationPayload($category);

        OtpCode::create([
            'email' => 'future@healernet.org',
            'code' => '1111',
            'type' => 'email',
            'expires_at' => now()->addMinutes(5),
            'used_at' => now(),
        ]);

        $response = $this->postJson('/api/auth/register', array_merge([
            'name' => 'Future User',
            'date_of_birth' => now()->addDay()->format('Y-m-d'),
            'email' => 'future@healernet.org',
            'mobile' => '+919876543213',
        ], $location));

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['date_of_birth']);
        $this->assertDatabaseMissing('users', ['email' => 'future@healernet.org']);
    }

    public function test_registration_accepts_full_name_alias_without_optional_fields(): void
    {
        $category = Category::factory()->create(['status' => 'active']);
        $location = $this->locationPayload($category);

        OtpCode::create([
            'email' => 'alias@healernet.org',
            'code' => '2222',
            'type' => 'email',
            'expires_at' => now()->addMinutes(5),
            'used_at' => now(),
        ]);

        $response = $this->postJson('/api/auth/register', array_merge([
            'full_name' => '  Priya Sharma  ',
            'email' => 'alias@healernet.org',
            'mobile' => '+919876543214',
        ], $location));

        $response->assertStatus(201);
        $this->assertDatabaseHas('users', [
            'email' => 'alias@healernet.org',
            'name' => 'Priya Sharma',
            'title' => null,
            'business_name' => null,
        ]);
    }

    public function test_registration_allowed_after_admin_soft_deletes_user(): void
    {
        $this->seed(\Database\Seeders\RolePermissionSeeder::class);

        $adminRole = Role::where('slug', 'admin')->firstOrFail();
        $admin = \App\Models\User::factory()->create(['role_id' => $adminRole->id]);
        $admin->syncRoles([$adminRole]);

        $category = Category::factory()->create(['status' => 'active']);
        $location = $this->locationPayload($category);

        $existing = \App\Models\User::factory()->create([
            'email' => 'reuse@healernet.org',
            'mobile' => '+919876543299',
        ]);

        \Laravel\Sanctum\Sanctum::actingAs($admin);
        $this->deleteJson("/api/admin/users/{$existing->id}")
            ->assertOk()
            ->assertJsonPath('status', 'success');

        $this->app['auth']->forgetGuards();
        $this->app['auth']->shouldUse('web');

        $existing->refresh();
        $this->assertNotNull($existing->deleted_at);
        $this->assertNotSame('reuse@healernet.org', $existing->email);
        $this->assertNotSame('+919876543299', $existing->mobile);

        OtpCode::create([
            'email' => 'reuse@healernet.org',
            'code' => '1234',
            'type' => 'email',
            'expires_at' => now()->addMinutes(5),
            'used_at' => now(),
        ]);

        $response = $this->postJson('/api/auth/register', array_merge([
            'name' => 'Reused Account',
            'email' => 'reuse@healernet.org',
            'mobile' => '+919876543299',
            'password' => 'SecurePass123!',
        ], $location));

        $response->assertCreated()->assertJsonPath('status', 'success');
        $this->assertDatabaseHas('users', [
            'email' => 'reuse@healernet.org',
            'mobile' => '+919876543299',
            'deleted_at' => null,
        ]);
        $this->assertTrue(
            \App\Models\User::query()->where('email', 'reuse@healernet.org')->exists()
        );
        $this->assertTrue(
            \App\Models\User::onlyTrashed()->where('id', $existing->id)->exists()
        );
    }
}
