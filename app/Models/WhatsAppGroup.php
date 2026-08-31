<?php

namespace App\Models;

use App\Services\WhatsAppGroupResolver;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class WhatsAppGroup extends Model
{
    use HasUuids;

    /** Normal WhatsApp group member limit. */
    public const MAX_MEMBERS = 1024;

    protected $table = 'whatsapp_groups';

    protected $fillable = [
        'category_id',
        'name',
        'description',
        'whatsapp_url',
        'max_members',
        'current_members',
        'status',
        'is_primary',
    ];

    protected function casts(): array
    {
        return [
            'max_members' => 'integer',
            'current_members' => 'integer',
            'is_primary' => 'boolean',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
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

    public function scopeEligiblePrimary(Builder $query): Builder
    {
        return app(WhatsAppGroupResolver::class)->applyEligiblePrimaryScope($query);
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
