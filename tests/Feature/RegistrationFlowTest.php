<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Country;
use App\Models\Region;
use App\Models\City;
use App\Models\User;
use App\Models\OtpCode;
use App\Models\CityWhatsAppGroup;
use App\Models\WhatsAppGroup;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegistrationFlowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        \App\Models\Role::create(['name' => 'User', 'slug' => 'user']);
    }

    public function test_send_and_verify_4digit_email_otp()
    {
        // 1. Send OTP
        $sendResponse = $this->postJson('/api/auth/send-registration-otp', [
            'email' => 'doctor@healernet.org'
        ]);

        $sendResponse->assertStatus(200);
        $sendResponse->assertJson(['status' => 'success']);

        // Assert 4-digit OTP created in DB
        $otpRecord = OtpCode::where('email', 'doctor@healernet.org')->where('type', 'email')->first();
        $this->assertNotNull($otpRecord);
        $this->assertEquals(4, strlen($otpRecord->code));

        // 2. Cooldown Rate Limit Test
        $cooldownResponse = $this->postJson('/api/auth/send-registration-otp', [
            'email' => 'doctor@healernet.org'
        ]);
        $cooldownResponse->assertStatus(429);

        // 3. Verify OTP
        $verifyResponse = $this->postJson('/api/auth/verify-registration-otp', [
            'email' => 'doctor@healernet.org',
            'otp' => $otpRecord->code
        ]);

        $verifyResponse->assertStatus(200);
        $verifyResponse->assertJson(['status' => 'success']);
        
        $otpRecord->refresh();
        $this->assertNotNull($otpRecord->used_at);
    }

    public function test_passwordless_registration_with_location_and_category()
    {
        $country = Country::create(['name' => 'India', 'code' => 'IN', 'phone_code' => '+91', 'status' => 'active']);
        $region = Region::create(['country_id' => $country->id, 'name' => 'Punjab', 'type' => 'state', 'status' => 'active']);
        $city = City::create(['region_id' => $region->id, 'name' => 'Chandigarh', 'status' => 'active']);
        $category = Category::factory()->create(['status' => 'active']);

        OtpCode::create([
            'email' => 'practitioner@healernet.org',
            'code' => '4321',
            'type' => 'email',
            'expires_at' => now()->addMinutes(10),
            'used_at' => now(),
        ]);

        $group = WhatsAppGroup::create([
            'category_id' => $category->id,
            'name' => 'Chandigarh Healthcare Group',
            'whatsapp_url' => 'https://chat.whatsapp.com/invite/CHANDIGARH123',
            'max_members' => 250,
            'current_members' => 10,
            'status' => 'active',
        ]);

        CityWhatsAppGroup::create([
            'city_id' => $city->id,
            'whatsapp_group_id' => $group->id,
            'display_order' => 1,
            'status' => 'active',
        ]);

        $response = $this->postJson('/api/auth/register', [
            'country_id' => $country->id,
            'region_id' => $region->id,
            'city_id' => $city->id,
            'category_id' => $category->id,
            'name' => 'Dr. Robert Bruce',
            'email' => 'practitioner@healernet.org',
            'mobile' => '+919876543210',
        ]);

        $response->assertStatus(201);
        $response->assertJsonStructure(['token', 'user', 'community']);
        $this->assertDatabaseHas('users', [
            'email' => 'practitioner@healernet.org',
            'country_id' => $country->id,
            'region_id' => $region->id,
            'city_id' => $city->id,
            'category_id' => $category->id,
        ]);
    }

    public function test_complete_registration_flow_with_title_dob_and_business_name(): void
    {
        $country = Country::create(['name' => 'India', 'code' => 'IN', 'phone_code' => '+91', 'status' => 'active']);
        $region = Region::create(['country_id' => $country->id, 'name' => 'Haryana', 'type' => 'state', 'status' => 'active']);
        $city = City::create(['region_id' => $region->id, 'name' => 'Sonipat', 'status' => 'active']);
        $category = Category::factory()->create(['status' => 'active']);

        $email = 'sarah.jenkins@healernet.org';

        $sendResponse = $this->postJson('/api/auth/send-registration-otp', ['email' => $email]);
        $sendResponse->assertStatus(200)->assertJson(['status' => 'success']);

        $otpRecord = OtpCode::where('email', $email)->where('type', 'email')->first();
        $this->assertNotNull($otpRecord);
        $this->assertEquals(4, strlen($otpRecord->code));

        $verifyResponse = $this->postJson('/api/auth/verify-registration-otp', [
            'email' => $email,
            'otp' => $otpRecord->code,
        ]);
        $verifyResponse->assertStatus(200)->assertJson(['status' => 'success']);

        $response = $this->postJson('/api/auth/register', [
            'country_id' => $country->id,
            'region_id' => $region->id,
            'city_id' => $city->id,
            'category_id' => $category->id,
            'title' => 'Dr.',
            'name' => 'Sarah Jenkins',
            'date_of_birth' => '1988-04-16',
            'email' => $email,
            'business_name' => 'Shanti Wellness Center',
            'mobile' => '+919876543210',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('user.title', 'Dr.')
            ->assertJsonPath('user.name', 'Sarah Jenkins')
            ->assertJsonPath('user.business_name', 'Shanti Wellness Center')
            ->assertJsonPath('user.email', $email);

        $this->assertDatabaseHas('users', [
            'email' => $email,
            'title' => 'Dr.',
            'name' => 'Sarah Jenkins',
            'business_name' => 'Shanti Wellness Center',
            'country_id' => $country->id,
            'region_id' => $region->id,
            'city_id' => $city->id,
            'category_id' => $category->id,
        ]);

        $user = User::where('email', $email)->first();
        $this->assertNotNull($user);
        $this->assertNotSame('Dr. Sarah Jenkins', $user->name);
        $this->assertSame('1988-04-16', $user->profile?->date_of_birth?->format('Y-m-d'));
        $this->assertNotEmpty($response->json('token'));
    }

    public function test_registration_rejects_display_formatted_date_of_birth(): void
    {
        $country = Country::create(['name' => 'India', 'code' => 'IN', 'phone_code' => '+91', 'status' => 'active']);
        $region = Region::create(['country_id' => $country->id, 'name' => 'Punjab', 'type' => 'state', 'status' => 'active']);
        $city = City::create(['region_id' => $region->id, 'name' => 'Chandigarh', 'status' => 'active']);
        $category = Category::factory()->create(['status' => 'active']);

        OtpCode::create([
            'email' => 'formatted@healernet.org',
            'code' => '3333',
            'type' => 'email',
            'expires_at' => now()->addMinutes(10),
            'used_at' => now(),
        ]);

        $response = $this->postJson('/api/auth/register', [
            'country_id' => $country->id,
            'region_id' => $region->id,
            'city_id' => $city->id,
            'category_id' => $category->id,
            'name' => 'Sarah Jenkins',
            'date_of_birth' => '16/08/2020',
            'email' => 'formatted@healernet.org',
            'mobile' => '+919876543219',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['date_of_birth']);
        $this->assertDatabaseMissing('users', ['email' => 'formatted@healernet.org']);
    }

    public function test_whatsapp_community_hierarchical_matching()
    {
        $country = Country::create(['name' => 'India', 'code' => 'IN', 'phone_code' => '+91', 'status' => 'active']);
        $region = Region::create(['country_id' => $country->id, 'name' => 'Rajasthan', 'type' => 'state', 'status' => 'active']);
        $city = City::create(['region_id' => $region->id, 'name' => 'Jaipur', 'status' => 'active']);

        $category = Category::factory()->create(['status' => 'active']);
        $group = WhatsAppGroup::create([
            'category_id' => $category->id,
            'name' => 'Jaipur Practitioners Network',
            'whatsapp_url' => 'https://chat.whatsapp.com/invite/JAIPUR123',
            'max_members' => 250,
            'current_members' => 5,
            'status' => 'active',
        ]);

        CityWhatsAppGroup::create([
            'city_id' => $city->id,
            'whatsapp_group_id' => $group->id,
            'display_order' => 1,
            'status' => 'active',
        ]);

        $response = $this->getJson("/api/whatsapp-community?city_id={$city->id}");

        $response->assertStatus(200);
        $response->assertJson([
            'status' => 'success',
            'community' => [
                'name' => 'Jaipur Practitioners Network',
                'whatsapp_link' => 'https://chat.whatsapp.com/invite/JAIPUR123',
            ]
        ]);
    }
}
