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
use App\Services\EmailService;
use App\Services\TemplateRendererService;
use Database\Seeders\EmailTemplateSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WelcomeEmailCommunityTest extends TestCase
{
    use RefreshDatabase;

    public function test_welcome_email_includes_only_assigned_category_group(): void
    {
        $this->seed(EmailTemplateSeeder::class);

        $country = Country::create(['name' => 'India', 'code' => 'IN', 'phone_code' => '+91', 'status' => 'active']);
        $region = Region::create(['country_id' => $country->id, 'name' => 'Haryana', 'type' => 'state', 'status' => 'active']);
        $city = City::create(['region_id' => $region->id, 'name' => 'Sonipat', 'status' => 'active']);
        $yogaCategory = Category::factory()->create(['name' => 'Yoga & Movement']);
        $nutritionCategory = Category::factory()->create(['name' => 'Nutrition Science']);

        $yogaGroup = WhatsAppGroup::create([
            'category_id' => $yogaCategory->id,
            'name' => 'Sonipat Yoga Circle',
            'whatsapp_url' => 'https://chat.whatsapp.com/sonipat-yoga',
            'max_members' => 250,
            'current_members' => 0,
            'status' => 'active',
        ]);

        $nutritionGroup = WhatsAppGroup::create([
            'category_id' => $nutritionCategory->id,
            'name' => 'Sonipat Nutrition Circle',
            'whatsapp_url' => 'https://chat.whatsapp.com/sonipat-nutrition',
            'max_members' => 250,
            'current_members' => 0,
            'status' => 'active',
        ]);

        foreach ([$yogaGroup, $nutritionGroup] as $index => $group) {
            CityWhatsAppGroup::create([
                'city_id' => $city->id,
                'whatsapp_group_id' => $group->id,
                'display_order' => $index + 1,
                'status' => 'active',
            ]);
        }

        $user = User::factory()->create([
            'category_id' => $yogaCategory->id,
            'country_id' => $country->id,
            'region_id' => $region->id,
            'city_id' => $city->id,
        ]);

        app(CommunityAssignmentService::class)->autoAssign($user);

        $variables = app(EmailService::class)->buildWelcomeVariables($user->fresh());
        $rendered = app(TemplateRendererService::class)->render('welcome-email', $variables);

        $this->assertStringContainsString('Sonipat Yoga Circle', $rendered['html']);
        $this->assertStringContainsString('https://chat.whatsapp.com/sonipat-yoga', $rendered['html']);
        $this->assertStringNotContainsString('Sonipat Nutrition Circle', $rendered['html']);
        $this->assertStringNotContainsString('https://chat.whatsapp.com/sonipat-nutrition', $rendered['html']);
        $this->assertSame('Sonipat Yoga Circle', $variables['group_name']);
    }
}
