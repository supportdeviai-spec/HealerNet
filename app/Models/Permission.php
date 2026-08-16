<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Permission as SpatiePermission;

class Permission extends SpatiePermission
{
    use HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $attributes = [
        'guard_name' => 'web',
    ];

    protected $fillable = ['name', 'slug', 'guard_name', 'group'];

    public function setNameAttribute($value): void
    {
        $this->attributes['name'] = $value;
        if (empty($this->attributes['slug'])) {
            $this->attributes['slug'] = Str::slug(str_replace('.', '-', $value));
        }
    }
}
