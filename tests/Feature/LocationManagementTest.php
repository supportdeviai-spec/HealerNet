<?php

namespace Tests\Feature;

use App\Enums\Status;
use App\Models\Category;
use App\Models\City;
use App\Models\CityWhatsAppGroup;
use App\Models\Country;
use App\Models\Region;
use App\Models\User;
use App\Models\Role;
use App\Models\WhatsAppGroup;
use App\Mail\WelcomeEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LocationManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function createAdmin(): User
    {
        $role = Role::create(['name' => 'Admin', 'slug' => 'admin']);
        return User::factory()->create(['role_id' => $role->id]);
    }

    protected function createWhatsAppGroup(array $overrides = []): WhatsAppGroup
    {
        $category = Category::create([
            'name' => 'Test Category',
            'slug' => 'test-category-' . uniqid(),
            'status' => 'active',
        ]);

        return WhatsAppGroup::create(array_merge([
            'category_id' => $category->id,
            'name' => 'Test WhatsApp Group',
            'description' => 'Test description',
            'whatsapp_url' => 'https://chat.whatsapp.com/example',
            'max_members' => 250,
            'current_members' => 0,
            'status' => 'active',
        ], $overrides));
    }

    public function test_admin_can_list_countries(): void
    {
        Sanctum::actingAs($this->createAdmin());
        Country::create(['name' => 'India', 'code' => 'IN', 'phone_code' => '+91', 'status' => Status::ACTIVE]);
        Country::create(['name' => 'Canada', 'code' => 'CA', 'phone_code' => '+1', 'status' => Status::ACTIVE]);

        $response = $this->getJson('/api/admin/countries?per_page=10&page=1');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('meta.total', 2);
    }

    public function test_admin_country_list_ignores_blank_search_param(): void
    {
        Sanctum::actingAs($this->createAdmin());
        Country::create(['name' => 'India', 'code' => 'IN', 'phone_code' => '+91', 'status' => Status::ACTIVE]);

        $response = $this->getJson('/api/admin/countries?search=&per_page=10&page=1');

        $response->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_admin_can_create_country(): void
    {
        Sanctum::actingAs($this->createAdmin());

        $response = $this->postJson('/api/admin/countries', [
            'name' => 'Japan',
            'code' => 'JP',
            'phone_code' => '+81',
            'status' => 'active',
        ]);

        $response->assertCreated()
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('countries', ['code' => 'JP', 'status' => 'active']);
    }

    public function test_duplicate_country_code_rejected(): void
    {
        Sanctum::actingAs($this->createAdmin());
        Country::create(['name' => 'India', 'code' => 'IN', 'phone_code' => '+91', 'status' => Status::ACTIVE]);

        $response = $this->postJson('/api/admin/countries', [
            'name' => 'India Duplicate',
            'code' => 'IN',
            'status' => 'active',
        ]);

        $response->assertStatus(422);
    }

    public function test_admin_can_deactivate_country(): void
    {
        Sanctum::actingAs($this->createAdmin());
        $country = Country::create(['name' => 'Kenya', 'code' => 'KE', 'phone_code' => '+254', 'status' => Status::ACTIVE]);

        $response = $this->patchJson("/api/admin/countries/{$country->id}/status", ['status' => 'inactive']);

        $response->assertOk();
        $this->assertDatabaseHas('countries', ['id' => $country->id, 'status' => 'inactive']);
    }

    public function test_region_belongs_to_country_and_duplicate_rejected(): void
    {
        Sanctum::actingAs($this->createAdmin());
        $country = Country::create(['name' => 'India', 'code' => 'IN', 'phone_code' => '+91', 'status' => Status::ACTIVE]);

        $this->postJson('/api/admin/regions', [
            'country_id' => $country->id,
            'name' => 'Punjab',
            'type' => 'state',
            'status' => 'active',
        ])->assertCreated();

        $this->postJson('/api/admin/regions', [
            'country_id' => $country->id,
            'name' => 'Punjab',
            'type' => 'state',
            'status' => 'active',
        ])->assertStatus(422);
    }

    public function test_city_validation_and_duplicate_within_region(): void
    {
        Sanctum::actingAs($this->createAdmin());
        $country = Country::create(['name' => 'Canada', 'code' => 'CA', 'phone_code' => '+1', 'status' => Status::ACTIVE]);
        $region = Region::create(['country_id' => $country->id, 'name' => 'Ontario', 'type' => 'province', 'status' => Status::ACTIVE]);

        $this->postJson('/api/admin/cities', [
            'region_id' => $region->id,
            'name' => 'Toronto',
            'latitude' => 43.6532,
            'longitude' => -79.3832,
            'status' => 'active',
        ])->assertCreated();

        $this->postJson('/api/admin/cities', [
            'region_id' => $region->id,
            'name' => 'Toronto',
            'status' => 'active',
        ])->assertStatus(422);

        $this->postJson('/api/admin/cities', [
            'region_id' => $region->id,
            'name' => 'Invalid City',
            'latitude' => 120,
            'status' => 'active',
        ])->assertStatus(422);
    }

    public function test_community_group_belongs_to_city_and_validates_whatsapp_url(): void
    {
        Sanctum::actingAs($this->createAdmin());
        $country = Country::create(['name' => 'India', 'code' => 'IN', 'phone_code' => '+91', 'status' => Status::ACTIVE]);
        $region = Region::create(['country_id' => $country->id, 'name' => 'Haryana', 'type' => 'state', 'status' => Status::ACTIVE]);
        $city = City::create(['region_id' => $region->id, 'name' => 'Sonipat', 'status' => Status::ACTIVE]);
        $groupOne = $this->createWhatsAppGroup(['name' => 'Sonipat Healers', 'whatsapp_url' => 'https://chat.whatsapp.com/example']);
        $groupTwo = $this->createWhatsAppGroup(['name' => 'Sonipat Healthcare Professionals', 'whatsapp_url' => 'https://chat.whatsapp.com/example2']);

        $this->postJson('/api/admin/community-groups', [
            'city_id' => $city->id,
            'status' => 'active',
        ])->assertStatus(422);

        $this->postJson('/api/admin/community-groups', [
            'city_id' => $city->id,
            'whatsapp_group_id' => $groupOne->id,
            'display_order' => 1,
            'status' => 'active',
        ])->assertCreated();

        $this->postJson('/api/admin/community-groups', [
            'city_id' => $city->id,
            'whatsapp_group_id' => $groupOne->id,
            'display_order' => 2,
            'status' => 'active',
        ])->assertStatus(422);

        $this->postJson('/api/admin/community-groups', [
            'city_id' => $city->id,
            'whatsapp_group_id' => $groupTwo->id,
            'display_order' => 2,
            'status' => 'active',
        ])->assertCreated();

        $this->assertEquals(2, CityWhatsAppGroup::where('city_id', $city->id)->count());
    }

    public function test_public_apis_return_only_active_records(): void
    {
        $activeCountry = Country::create(['name' => 'Active Land', 'code' => 'AL', 'phone_code' => '+1', 'status' => Status::ACTIVE]);
        Country::create(['name' => 'Inactive Land', 'code' => 'IL', 'phone_code' => '+2', 'status' => Status::INACTIVE]);

        $activeRegion = Region::create(['country_id' => $activeCountry->id, 'name' => 'Active Region', 'type' => 'state', 'status' => Status::ACTIVE]);
        Region::create(['country_id' => $activeCountry->id, 'name' => 'Inactive Region', 'type' => 'state', 'status' => Status::INACTIVE]);

        $activeCity = City::create(['region_id' => $activeRegion->id, 'name' => 'Active City', 'status' => Status::ACTIVE]);
        City::create(['region_id' => $activeRegion->id, 'name' => 'Inactive City', 'status' => Status::INACTIVE]);

        $activeGroup = $this->createWhatsAppGroup([
            'name' => 'Active Group',
            'whatsapp_url' => 'https://chat.whatsapp.com/active',
            'status' => 'active',
        ]);
        $inactiveGroup = $this->createWhatsAppGroup([
            'name' => 'Inactive Group',
            'whatsapp_url' => 'https://chat.whatsapp.com/inactive',
            'status' => 'inactive',
        ]);

        CityWhatsAppGroup::create([
            'city_id' => $activeCity->id,
            'whatsapp_group_id' => $activeGroup->id,
            'display_order' => 1,
            'status' => 'active',
        ]);
        CityWhatsAppGroup::create([
            'city_id' => $activeCity->id,
            'whatsapp_group_id' => $inactiveGroup->id,
            'display_order' => 2,
            'status' => 'inactive',
        ]);

        $this->getJson('/api/countries')->assertOk()->assertJsonCount(1, 'data');
        $this->getJson("/api/countries/{$activeCountry->id}/regions")->assertOk()->assertJsonCount(1, 'data');
        $this->getJson("/api/regions/{$activeRegion->id}/cities")->assertOk()->assertJsonCount(1, 'data');
        $this->getJson("/api/cities/{$activeCity->id}/community-groups")->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_welcome_email_includes_dynamic_community_groups(): void
    {
        Mail::fake();
        $this->seed(\Database\Seeders\EmailTemplateSeeder::class);

        $country = Country::create(['name' => 'India', 'code' => 'IN', 'phone_code' => '+91', 'status' => Status::ACTIVE]);
        $region = Region::create(['country_id' => $country->id, 'name' => 'Haryana', 'type' => 'state', 'status' => Status::ACTIVE]);
        $city = City::create(['region_id' => $region->id, 'name' => 'Sonipat', 'status' => Status::ACTIVE]);
        $category = \App\Models\Category::factory()->create();
        $user = User::factory()->create([
            'category_id' => $category->id,
            'country_id' => $country->id,
            'region_id' => $region->id,
            'city_id' => $city->id,
        ]);

        $activeGroup = $this->createWhatsAppGroup([
            'category_id' => $category->id,
            'name' => 'Sonipat Healers',
            'whatsapp_url' => 'https://chat.whatsapp.com/sonipat',
            'status' => 'active',
        ]);

        CityWhatsAppGroup::create([
            'city_id' => $city->id,
            'whatsapp_group_id' => $activeGroup->id,
            'display_order' => 1,
            'status' => 'active',
        ]);

        app(\App\Services\CommunityAssignmentService::class)->autoAssign($user);

        Mail::to($user->email)->send(new WelcomeEmail($user->fresh()));

        Mail::assertSent(WelcomeEmail::class, function (WelcomeEmail $mail) use ($user, $activeGroup) {
            return $mail->hasTo($user->email)
                && str_contains($mail->render(), 'Sonipat Healers')
                && str_contains($mail->render(), $activeGroup->whatsapp_url);
        });
    }
}
