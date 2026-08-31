<?php

namespace App\Services;

use App\Models\WhatsAppGroup;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class WhatsAppGroupPrimaryService
{
    /**
     * Mark one group as primary for its category; demote any other primary in the same category.
     */
    public function setPrimary(WhatsAppGroup $group): WhatsAppGroup
    {
        if (!$group->category_id) {
            throw new InvalidArgumentException('A healthcare category is required before marking a group as primary.');
        }

        DB::transaction(function () use ($group) {
            WhatsAppGroup::query()
                ->where('category_id', $group->category_id)
                ->lockForUpdate()
                ->get();

            WhatsAppGroup::query()
                ->where('category_id', $group->category_id)
                ->where('is_primary', true)
                ->whereKeyNot($group->id)
                ->update(['is_primary' => false]);

            $group->update(['is_primary' => true]);
        });

        return $group->fresh();
    }

    public function clearPrimary(WhatsAppGroup $group): WhatsAppGroup
    {
        $group->update(['is_primary' => false]);

        return $group->fresh();
    }
}
