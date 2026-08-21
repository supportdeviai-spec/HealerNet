<?php

namespace App\Models;

use App\Enums\Status;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class City extends Model
{
    protected $fillable = ['region_id', 'name', 'latitude', 'longitude', 'status'];

    protected function casts(): array
    {
        return [
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
            'status' => Status::class,
        ];
    }

    public function region(): BelongsTo
    {
        return $this->belongsTo(Region::class);
    }

    /** @deprecated Use region() */
    public function state(): BelongsTo
    {
        return $this->region();
    }

    public function communityGroups(): HasMany
    {
        return $this->hasMany(CommunityGroup::class);
    }

    public function whatsappGroups(): BelongsToMany
    {
        // Explicit keys: Laravel would otherwise infer whats_app_group_id from WhatsAppGroup
        return $this->belongsToMany(WhatsAppGroup::class, 'city_whatsapp_groups', 'city_id', 'whatsapp_group_id')
            ->withPivot(['display_order', 'status'])
            ->withTimestamps()
            ->orderByPivot('display_order')
            ->orderBy('whatsapp_groups.name');
    }

    /** Active city↔group mappings only (for city list display). */
    public function activeWhatsappGroups(): BelongsToMany
    {
        return $this->belongsToMany(WhatsAppGroup::class, 'city_whatsapp_groups', 'city_id', 'whatsapp_group_id')
            ->withPivot(['display_order', 'status'])
            ->withTimestamps()
            ->wherePivot('status', 'active')
            ->where('whatsapp_groups.status', 'active')
            ->orderByPivot('display_order')
            ->orderBy('whatsapp_groups.name');
    }

    public function cityWhatsappGroups(): HasMany
    {
        return $this->hasMany(CityWhatsAppGroup::class);
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', Status::ACTIVE->value);
    }
}
