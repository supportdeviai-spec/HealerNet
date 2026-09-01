<?php

namespace App\Services;

use App\Exceptions\GuardedDeletionException;
use App\Models\City;
use App\Models\CommunityGroup;
use App\Models\Country;
use App\Models\Region;
use App\Models\User;
use App\Models\WhatsAppGroup;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class GuardedRecordDeletionService
{
    public function deleteWhatsAppGroup(WhatsAppGroup $group): void
    {
        DB::transaction(function () use ($group) {
            /** @var WhatsAppGroup|null $locked */
            $locked = WhatsAppGroup::query()->whereKey($group->getKey())->lockForUpdate()->first();
            if (! $locked) {
                throw new GuardedDeletionException('WhatsApp group not found.', ['reason' => 'not_found'], 404);
            }

            $membersCount = (int) DB::table('community_members')
                ->where('whatsapp_group_id', $locked->id)
                ->count();

            $mappingsCount = (int) DB::table('city_whatsapp_groups')
                ->where('whatsapp_group_id', $locked->id)
                ->count();

            if ($membersCount > 0 || $mappingsCount > 0) {
                $reasons = [];
                if ($membersCount > 0) {
                    $reasons[] = 'it has community members';
                }
                if ($mappingsCount > 0) {
                    $reasons[] = "it is mapped to {$mappingsCount} location(s). Remove the location mappings in Group Management first";
                }

                $reason = $membersCount > 0 && $mappingsCount > 0
                    ? 'has_members_and_mappings'
                    : ($membersCount > 0 ? 'has_members' : 'has_city_mappings');

                throw new GuardedDeletionException(
                    'This WhatsApp group cannot be deleted because '.implode(', and ', $reasons).'.',
                    [
                        'reason' => $reason,
                        'members_count' => $membersCount,
                        'cities_count' => $mappingsCount,
                        'group_name' => $locked->name,
                    ]
                );
            }

            $this->deleteOrConflict($locked, 'This WhatsApp group cannot be deleted because related data still exists.');
        });
    }

    public function deleteCountry(Country $country): void
    {
        DB::transaction(function () use ($country) {
            /** @var Country|null $locked */
            $locked = Country::query()->whereKey($country->getKey())->lockForUpdate()->first();
            if (! $locked) {
                throw new GuardedDeletionException('Country not found.', ['reason' => 'not_found'], 404);
            }

            $statesCount = (int) Region::query()->where('country_id', $locked->id)->count();
            if ($statesCount > 0) {
                throw new GuardedDeletionException(
                    'Cannot delete this country because states exist under it.',
                    [
                        'reason' => 'has_states',
                        'states_count' => $statesCount,
                    ]
                );
            }

            $usersCount = $this->usersCount('country_id', $locked->id);
            if ($usersCount > 0) {
                throw new GuardedDeletionException(
                    'Cannot delete this country because users are associated with this location.',
                    [
                        'reason' => 'has_users',
                        'users_count' => $usersCount,
                    ]
                );
            }

            $this->deleteOrConflict($locked, 'Cannot delete this country because related data still exists.');
        });
    }

    public function deleteRegion(Region $region): void
    {
        DB::transaction(function () use ($region) {
            /** @var Region|null $locked */
            $locked = Region::query()->whereKey($region->getKey())->lockForUpdate()->first();
            if (! $locked) {
                throw new GuardedDeletionException('State not found.', ['reason' => 'not_found'], 404);
            }

            $districtsCount = (int) City::query()->where('region_id', $locked->id)->count();
            if ($districtsCount > 0) {
                throw new GuardedDeletionException(
                    'Cannot delete this state because districts exist under it.',
                    [
                        'reason' => 'has_districts',
                        'districts_count' => $districtsCount,
                    ]
                );
            }

            $usersCount = $this->usersCount('region_id', $locked->id);
            if ($usersCount > 0) {
                throw new GuardedDeletionException(
                    'Cannot delete this state because users are associated with this location.',
                    [
                        'reason' => 'has_users',
                        'users_count' => $usersCount,
                    ]
                );
            }

            $this->deleteOrConflict($locked, 'Cannot delete this state because related data still exists.');
        });
    }

    public function deleteCity(City $city): void
    {
        DB::transaction(function () use ($city) {
            /** @var City|null $locked */
            $locked = City::query()->whereKey($city->getKey())->lockForUpdate()->first();
            if (! $locked) {
                throw new GuardedDeletionException('District not found.', ['reason' => 'not_found'], 404);
            }

            $usersCount = $this->usersCount('city_id', $locked->id);
            if ($usersCount > 0) {
                throw new GuardedDeletionException(
                    'Cannot delete this district because users are registered in this location.',
                    [
                        'reason' => 'has_users',
                        'users_count' => $usersCount,
                    ]
                );
            }

            $mappingsCount = (int) DB::table('city_whatsapp_groups')
                ->where('city_id', $locked->id)
                ->count();
            if ($mappingsCount > 0) {
                throw new GuardedDeletionException(
                    'Cannot delete this district because WhatsApp groups are mapped to this location.',
                    [
                        'reason' => 'has_whatsapp_mappings',
                        'mappings_count' => $mappingsCount,
                    ]
                );
            }

            $legacyCount = $this->legacyCommunityGroupsCount($locked->id);
            if ($legacyCount > 0) {
                throw new GuardedDeletionException(
                    'Cannot delete this district because related community records still exist.',
                    [
                        'reason' => 'has_legacy_community_groups',
                        'legacy_community_groups_count' => $legacyCount,
                    ]
                );
            }

            $this->deleteOrConflict($locked, 'Cannot delete this district because related data still exists.');
        });
    }

    private function usersCount(string $column, int $id): int
    {
        return (int) User::withTrashed()->where($column, $id)->count();
    }

    private function legacyCommunityGroupsCount(int $cityId): int
    {
        if (! Schema::hasTable('community_groups')) {
            return 0;
        }

        return (int) CommunityGroup::withTrashed()->where('city_id', $cityId)->count();
    }

    private function deleteOrConflict(Country|Region|City|WhatsAppGroup $record, string $fallbackMessage): void
    {
        try {
            $record->delete();
        } catch (QueryException $e) {
            throw new GuardedDeletionException(
                $fallbackMessage,
                ['reason' => 'foreign_key'],
                409,
                $e
            );
        }
    }
}
