<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\City;
use App\Models\CityWhatsAppGroup;
use App\Models\WhatsAppGroup;
use Illuminate\Database\Seeder;

class CommunitySeeder extends Seeder
{
    public function run(): void
    {
        if (app()->environment('production')) {
            return;
        }

        $categories = Category::all();
        $cities = City::query()->orderBy('id')->limit(5)->get();

        if ($categories->isEmpty() || $cities->isEmpty()) {
            return;
        }

        $primaryByCategory = collect();

        foreach ($categories as $index => $category) {
            for ($i = 1; $i <= 2; $i++) {
                $group = WhatsAppGroup::updateOrCreate(
                    [
                        'name' => "{$category->name} Cohort {$i}",
                    ],
                    [
                        'category_id' => $category->id,
                        'description' => "WhatsApp community for {$category->name} practitioners.",
                        'whatsapp_url' => "https://chat.whatsapp.com/invite/DEMO{$index}{$i}",
                        'max_members' => 250,
                        'current_members' => $i === 1 ? 46 : 12,
                        'status' => 'active',
                    ]
                );

                if ($i === 1) {
                    $primaryByCategory->put($category->id, $group);
                }
            }
        }

        // Every city gets one active cohort per category (registration + welcome email need this).
        foreach ($cities as $city) {
            $order = 0;
            foreach ($primaryByCategory as $group) {
                CityWhatsAppGroup::updateOrCreate(
                    [
                        'city_id' => $city->id,
                        'whatsapp_group_id' => $group->id,
                    ],
                    [
                        'display_order' => $order++,
                        'status' => 'active',
                    ]
                );
            }
        }
    }
}
