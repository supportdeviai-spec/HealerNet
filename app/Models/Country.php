<?php

namespace App\Models;

use App\Enums\Status;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Country extends Model
{
    protected $fillable = ['name', 'code', 'phone_code', 'status'];

    protected function casts(): array
    {
        return [
            'status' => Status::class,
        ];
    }

    public function regions(): HasMany
    {
        return $this->hasMany(Region::class);
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
