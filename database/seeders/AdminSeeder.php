<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Role;
use App\Models\Country;
use App\Models\Region;
use App\Models\City;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        $adminRole = Role::where('slug', 'admin')->first()
                  ?? Role::where('name', 'like', '%admin%')->first()
                  ?? Role::create(['name' => 'Super Admin', 'slug' => 'admin']);

        $country = Country::first();
        $region = Region::first();
        $city = City::first();

        User::updateOrCreate(
            ['email' => 'admin@healernet.org'],
            [
                'name' => 'System Administrator',
                'mobile' => '+19999999999',
                'password' => Hash::make('Admin@123'),
                'role_id' => $adminRole->id,
                'country_id' => $country?->id,
                'region_id' => $region?->id,
                'city_id' => $city?->id,
                'email_verified_at' => now(),
                'status' => 'active'
            ]
        );
    }
}
