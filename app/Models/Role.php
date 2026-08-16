<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role as SpatieRole;

class Role extends SpatieRole
{
    use HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $attributes = [
        'guard_name' => 'web',
    ];

    protected $fillable = ['name', 'slug', 'description', 'status', 'guard_name', 'is_system'];

    protected $casts = [
        'is_system' => 'boolean',
    ];

    public function setNameAttribute($value): void
    {
        $this->attributes['name'] = $value;
        if (empty($this->attributes['slug'])) {
            $this->attributes['slug'] = Str::slug($value);
        }
    }

    public function isSuperAdmin(): bool
    {
        return ($this->slug ?? '') === 'admin';
    }
}
