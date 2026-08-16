<?php

namespace Database\Seeders;

use App\Enums\Status;
use App\Models\Country;
use App\Models\Region;
use App\Models\City;
use Illuminate\Database\Seeder;

class LocationSeeder extends Seeder
{
    public function run(): void
    {
        $locations = [
            'India' => [
                'code' => 'IN',
                'phone_code' => '+91',
                'regions' => [
                    'Rajasthan' => ['type' => 'state', 'cities' => ['Jaipur', 'Udaipur', 'Jodhpur', 'Kota']],
                    'Punjab' => ['type' => 'state', 'cities' => ['Chandigarh', 'Ludhiana', 'Amritsar']],
                    'Haryana' => ['type' => 'state', 'cities' => ['Sonipat', 'Gurugram', 'Faridabad']],
                    'Maharashtra' => ['type' => 'state', 'cities' => ['Mumbai', 'Pune', 'Nagpur']],
                    'Delhi' => ['type' => 'state', 'cities' => ['New Delhi', 'South Delhi', 'North Delhi']],
                ],
            ],
            'United States' => [
                'code' => 'US',
                'phone_code' => '+1',
                'regions' => [
                    'California' => ['type' => 'state', 'cities' => ['Los Angeles', 'San Francisco', 'San Diego']],
                    'New York' => ['type' => 'state', 'cities' => ['New York City', 'Buffalo']],
                ],
            ],
            'Canada' => [
                'code' => 'CA',
                'phone_code' => '+1',
                'regions' => [
                    'Ontario' => ['type' => 'province', 'cities' => ['Toronto', 'Ottawa']],
                    'British Columbia' => ['type' => 'province', 'cities' => ['Vancouver', 'Victoria']],
                ],
            ],
            'United Kingdom' => [
                'code' => 'GB',
                'phone_code' => '+44',
                'regions' => [
                    'England' => ['type' => 'country', 'cities' => ['London', 'Manchester', 'Birmingham']],
                    'Scotland' => ['type' => 'country', 'cities' => ['Edinburgh', 'Glasgow']],
                ],
            ],
        ];

        foreach ($locations as $countryName => $data) {
            $country = Country::firstOrCreate(
                ['code' => $data['code']],
                [
                    'name' => $countryName,
                    'phone_code' => $data['phone_code'],
                    'status' => Status::ACTIVE,
                ]
            );

            foreach ($data['regions'] as $regionName => $regionData) {
                $region = Region::firstOrCreate(
                    [
                        'country_id' => $country->id,
                        'name' => $regionName,
                    ],
                    [
                        'type' => $regionData['type'],
                        'status' => Status::ACTIVE,
                    ]
                );

                foreach ($regionData['cities'] as $cityName) {
                    City::firstOrCreate(
                        [
                            'region_id' => $region->id,
                            'name' => $cityName,
                        ],
                        [
                            'status' => Status::ACTIVE,
                        ]
                    );
                }
            }
        }
    }
}
