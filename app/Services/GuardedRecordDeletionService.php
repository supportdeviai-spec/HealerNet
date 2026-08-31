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

            if ($membersCount > 0) {
                throw new GuardedDeletionException(
                    'This WhatsApp group cannot be deleted because it has community members.',
                    [
                        'reason' => 'has_members',
                        'members_count' => $membersCount,
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
                    "Cannot delete {$locked->name} because {$statesCount} state(s) still exist under it. Delete those states first.",
                    [
                        'reason' => 'has_states',
                        'states_count' => $statesCount,
                    ]
                );
            }

            $usersCount = $this->memberUsersCount('country_id', $locked->id);
            if ($usersCount > 0) {
                throw new GuardedDeletionException(
                    "Cannot delete {$locked->name} because {$usersCount} registered member(s) are associated with this country. Admin accounts do not block delete.",
                    [
                        'reason' => 'has_users',
                        'users_count' => $usersCount,
                    ]
                );
            }

            $this->detachAdminsFromLocation('country_id', $locked->id);
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
                    "Cannot delete {$locked->name} because {$districtsCount} district(s) still exist under it. Delete those districts first.",
                    [
                        'reason' => 'has_districts',
                        'districts_count' => $districtsCount,
                    ]
                );
            }

            $usersCount = $this->memberUsersCount('region_id', $locked->id);
            if ($usersCount > 0) {
                throw new GuardedDeletionException(
                    "Cannot delete {$locked->name} because {$usersCount} registered member(s) are associated with this state. Admin accounts do not block delete.",
                    [
                        'reason' => 'has_users',
                        'users_count' => $usersCount,
                    ]
                );
            }

            $this->detachAdminsFromLocation('region_id', $locked->id);
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

            $usersCount = $this->memberUsersCount('city_id', $locked->id);
            if ($usersCount > 0) {
                throw new GuardedDeletionException(
                    "Cannot delete {$locked->name} because {$usersCount} registered member(s) are in this district. The admin account does not count as a member.",
                    [
                        'reason' => 'has_users',
                        'users_count' => $usersCount,
                    ]
                );
            }

            $legacyMembersCount = $this->legacyCommunityGroupMembersInCity($locked->id);
            if ($legacyMembersCount > 0) {
                throw new GuardedDeletionException(
                    "Cannot delete {$locked->name} because related community records still have members.",
                    [
                        'reason' => 'has_legacy_community_groups',
                        'legacy_community_groups_count' => $legacyMembersCount,
                    ]
                );
            }

            $this->deleteEmptyLegacyCommunityGroups($locked->id);
            $this->detachAdminsFromLocation('city_id', $locked->id);
            $this->deleteOrConflict($locked, 'Cannot delete this district because related data still exists.');
        });
    }

    private function memberUsersCount(string $column, int $id): int
    {
        return (int) User::withTrashed()->notAdmin()->where($column, $id)->count();
    }

    private function detachAdminsFromLocation(string $column, int $id): void
    {
        User::withTrashed()
            ->admins()
            ->where($column, $id)
            ->update([$column => null]);
    }

    private function legacyCommunityGroupMembersInCity(int $cityId): int
    {
        if (! Schema::hasTable('community_groups') || ! Schema::hasTable('community_members')) {
            return 0;
        }

        return (int) DB::table('community_members')
            ->join('community_groups', 'community_groups.id', '=', 'community_members.community_group_id')
            ->where('community_groups.city_id', $cityId)
            ->count();
    }

    private function deleteEmptyLegacyCommunityGroups(int $cityId): void
    {
        if (! Schema::hasTable('community_groups')) {
            return;
        }

        CommunityGroup::withTrashed()
            ->where('city_id', $cityId)
            ->get()
            ->each(function (CommunityGroup $group) {
                $group->forceDelete();
            });
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
