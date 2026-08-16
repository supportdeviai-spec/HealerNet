<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['name' => 'Yoga & Movement', 'icon' => '🧘', 'description' => 'Asana practice, breathwork and mobility circles.', 'status' => 'active'],
            ['name' => 'Nutrition Science', 'icon' => '🥗', 'description' => 'Evidence-based dietary guidance and metabolic health.', 'status' => 'active'],
            ['name' => 'Mental Wellness', 'icon' => '🧠', 'description' => 'Peer support grounded in CBT and mindfulness research.', 'status' => 'active'],
            ['name' => 'Sleep Medicine', 'icon' => '🌙', 'description' => 'Circadian health and clinical sleep hygiene.', 'status' => 'active'],
            ['name' => 'Chronic Pain', 'icon' => '🦴', 'description' => 'Physiotherapy-led management and mobility work.', 'status' => 'active'],
        ];

        foreach ($categories as $cat) {
            Category::firstOrCreate(
                ['slug' => Str::slug($cat['name'])],
                $cat
            );
        }
    }
}
