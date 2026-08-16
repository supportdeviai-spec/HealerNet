<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\City;
use App\Models\CityWhatsAppGroup;
use App\Models\Country;
use App\Models\Region;
use App\Models\User;
use App\Models\WhatsAppGroup;
use App\Services\CommunityAssignmentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CommunityAssignmentTest extends TestCase
{
    use RefreshDatabase;

    public function test_users_are_auto_routed_on_registration_lock()
    {
        $country = Country::create(['name' => 'India', 'code' => 'IN', 'phone_code' => '+91', 'status' => 'active']);
        $region = Region::create(['country_id' => $country->id, 'name' => 'Rajasthan', 'type' => 'state', 'status' => 'active']);
        $city = City::create(['region_id' => $region->id, 'name' => 'Jaipur', 'status' => 'active']);
        $category = Category::factory()->create();

        $group = WhatsAppGroup::create([
            'category_id' => $category->id,
            'name' => 'Test Cohort',
            'whatsapp_url' => 'https://chat.whatsapp.com/test',
            'max_members' => 1,
            'current_members' => 0,
            'status' => 'active',
        ]);

        CityWhatsAppGroup::create([
            'city_id' => $city->id,
            'whatsapp_group_id' => $group->id,
            'display_order' => 1,
            'status' => 'active',
        ]);

        $user = User::factory()->create([
            'category_id' => $category->id,
            'country_id' => $country->id,
            'region_id' => $region->id,
            'city_id' => $city->id,
        ]);

        $service = new CommunityAssignmentService();
        $response = $service->autoAssign($user);

        $this->assertTrue($response['success'], $response['message'] ?? 'autoAssign failed');

        $group->refresh();
        $this->assertEquals(1, $group->current_members);
        $this->assertEquals('full', $group->status);
    }
}
