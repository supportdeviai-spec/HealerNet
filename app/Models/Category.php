<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Category extends Model
{
    use HasUuids, SoftDeletes, HasFactory;

    protected $fillable = ['name', 'slug', 'icon', 'description', 'status', 'sort_order'];

    protected $casts = [
        'sort_order' => 'integer',
    ];

    public function setNameAttribute($value)
    {
        $this->attributes['name'] = $value;
        $this->attributes['slug'] = Str::slug($value);
    }

    protected static function booted(): void
    {
        static::deleting(function (Category $category) {
            if ($category->isForceDeleting()) {
                return;
            }

            $category->releaseUniqueIdentifiers();
        });
    }

    public function releaseUniqueIdentifiers(): void
    {
        $stamp = $this->id.'-'.now()->timestamp;
        $this->forceFill([
            'name' => "deleted-{$stamp}",
        ])->saveQuietly();
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /** @deprecated Use whatsappGroups() */
    public function communityGroups(): HasMany
    {
        return $this->hasMany(CommunityGroup::class);
    }

    public function whatsappGroups(): HasMany
    {
        return $this->hasMany(WhatsAppGroup::class);
    }

    public function events(): HasMany
    {
        return $this->hasMany(Event::class);
    }
}