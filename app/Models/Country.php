<?php

namespace App\Models;

use App\Enums\Status;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Country extends Model
{
    protected $fillable = [
        'name',
        'code',
        'phone_code',
        'mobile_min_length',
        'mobile_max_length',
        'mobile_starts_with',
        'region_label',
        'city_label',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'status' => Status::class,
            'mobile_min_length' => 'integer',
            'mobile_max_length' => 'integer',
        ];
    }

    public function regions(): HasMany
    {
        return $this->hasMany(Region::class);
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    /** @deprecated Use regions() */
    public function states(): HasMany
    {
        return $this->regions();
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', Status::ACTIVE->value);
    }
}
