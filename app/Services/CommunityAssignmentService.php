<?php

namespace App\Services;

use App\Models\CityWhatsAppGroup;
use App\Models\User;
use App\Models\WhatsAppGroup;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CommunityAssignmentService
{
    /**
     * Assign user to the WhatsApp group mapped to their city (Group Management).
     */
    public function autoAssign(User $user)
    {
        if (!$user->city_id) {
            return ['success' => false, 'message' => 'User has no city defined.'];
        }

        $existing = $user->whatsappGroups()->exists();
        if ($existing) {
            return ['success' => true, 'message' => 'User is already assigned to a community.'];
        }

        $group = null;

        try {
            DB::transaction(function () use ($user, &$group) {
                $group = $this->findCityWhatsAppGroup($user, forAssignment: true);

                if (!$group) {
                    throw new \Exception('No active WhatsApp community is mapped to this city.');
                }

                $user->whatsappGroups()->attach($group->id, ['joined_at' => now()]);
                $group->increment('current_members');

                if ($group->max_members && $group->current_members >= $group->max_members) {
                    $group->update(['status' => 'full']);
                    Log::info("System Auth: Auto-Closed WhatsApp Group ID: {$group->id} as it reached max_members.");
                }
            });

            return ['success' => true, 'group' => $group];
        } catch (\Exception $e) {
            Log::warning("Community Auto Assignment Failed for User {$user->id}: " . $e->getMessage());
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    /**
     * WhatsApp group for welcome email: already assigned, else city mapping from Group Management.
     */
    public function welcomeCommunityGroup(User $user): ?WhatsAppGroup
    {
        $user->loadMissing(['whatsappGroups']);

        $assigned = $user->whatsappGroups->first();
        if ($assigned) {
            return $assigned;
        }

        return $this->findCityWhatsAppGroup($user, forAssignment: false);
    }

    /**
     * Active WhatsApp group linked to the user's city (city-wise from Group Management).
     */
    private function findCityWhatsAppGroup(User $user, bool $forAssignment = false): ?WhatsAppGroup
    {
        if (!$user->city_id) {
            return null;
        }

        $mappingQuery = CityWhatsAppGroup::query()
            ->where('city_id', $user->city_id)
            ->where('status', 'active')
            ->orderBy('display_order')
            ->orderBy('id');

        if ($forAssignment) {
            $mappingQuery->lockForUpdate();
        }

        $mappings = $mappingQuery->get();
        if ($mappings->isEmpty()) {
            return null;
        }

        $groupQuery = WhatsAppGroup::query()
            ->whereIn('id', $mappings->pluck('whatsapp_group_id'))
            ->whereIn('status', ['active', 'full']);

        if ($forAssignment) {
            $groupQuery->lockForUpdate();
        }

        $groupsById = $groupQuery->get()->keyBy('id');

        $ordered = $mappings
            ->map(fn (CityWhatsAppGroup $mapping) => $groupsById->get($mapping->whatsapp_group_id))
            ->filter();

        if ($ordered->isEmpty()) {
            return null;
        }

        if ($forAssignment) {
            $withCapacity = $ordered->first(function (WhatsAppGroup $group) {
                return !$group->max_members || $group->current_members < $group->max_members;
            });

            return $withCapacity;
        }

        return $ordered->first();
    }
}
