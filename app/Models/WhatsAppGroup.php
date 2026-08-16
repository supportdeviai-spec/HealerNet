<?php

namespace App\Models;

use App\Enums\Status;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class WhatsAppGroup extends Model
{
    use HasUuids;

    protected $table = 'whatsapp_groups';

    protected $fillable = [
        'category_id',
        'name',
        'description',
        'whatsapp_url',
        'max_members',
        'current_members',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'max_members' => 'integer',
            'current_members' => 'integer',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function cities(): BelongsToMany
    {
        // Explicit keys: Laravel would otherwise infer whats_app_group_id from WhatsAppGroup
        return $this->belongsToMany(City::class, 'city_whatsapp_groups', 'whatsapp_group_id', 'city_id')
            ->withPivot(['display_order', 'status'])
            ->withTimestamps();
    }

    public function cityMappings()
    {
        return $this->hasMany(CityWhatsAppGroup::class, 'whatsapp_group_id');
    }

    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'community_members', 'whatsapp_group_id', 'user_id')
            ->withPivot('joined_at');
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', 'active');
    }

    public function getWhatsappLinkAttribute(): ?string
    {
        return $this->whatsapp_url;
    }

    public function getIsFullAttribute(): bool
    {
        if ($this->max_members && $this->current_members >= $this->max_members) {
            return true;
        }

        return $this->status === 'full';
    }
}
