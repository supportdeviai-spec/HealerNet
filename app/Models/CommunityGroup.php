<?php

namespace App\Models;

use App\Enums\Status;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class CommunityGroup extends Model
{
    use HasUuids, SoftDeletes;

    protected $fillable = [
        'category_id',
        'city_id',
        'name',
        'description',
        'whatsapp_url',
        'display_order',
        'max_members',
        'current_members',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'max_members' => 'integer',
            'current_members' => 'integer',
            'display_order' => 'integer',
        ];
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

    public function city(): BelongsTo
    {
        return $this->belongsTo(City::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'community_members')->withPivot('joined_at');
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', Status::ACTIVE->value);
    }
}
