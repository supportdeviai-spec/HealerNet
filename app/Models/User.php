<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use App\Models\WhatsAppGroup;
use App\Support\PermissionCatalog;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, HasRoles, Notifiable, SoftDeletes;

    protected string $guard_name = 'web';

    protected $fillable = [
        'title',
        'name',
        'business_name',
        'email',
        'phone',
        'mobile', 
        'password',
        'role_id',
        'category_id',
        'country_id',
        'region_id',
        'city_id',
        'status',
        'is_verified',
        'last_login_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'region_id',
    ];

    protected $appends = [
        'state_id',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_verified' => 'boolean',
            'last_login_at' => 'datetime',
        ];
    }

    public function profile(): HasOne
    {
        return $this->hasOne(UserProfile::class);
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function communities(): BelongsToMany
    {
        return $this->belongsToMany(CommunityGroup::class, 'community_members')
                    ->withPivot('joined_at');
    }

    public function whatsappGroups(): BelongsToMany
    {
        return $this->belongsToMany(WhatsAppGroup::class, 'community_members', 'user_id', 'whatsapp_group_id')
            ->withPivot('joined_at');
    }

    public function events(): BelongsToMany
    {
        return $this->belongsToMany(Event::class, 'event_registrations')
                    ->withPivot('registered_at');
    }

    public function supportTickets(): HasMany
    {
        return $this->hasMany(SupportTicket::class);
    }

    public function country(): BelongsTo
    {
        return $this->belongsTo(Country::class, 'country_id');
    }

    public function region(): BelongsTo
    {
        return $this->belongsTo(Region::class, 'region_id');
    }

    public function state(): BelongsTo
    {
        return $this->region();
    }

    public function getStateIdAttribute(): ?int
    {
        $value = $this->attributes['region_id'] ?? null;

        return $value !== null ? (int) $value : null;
    }

    public function setStateIdAttribute($value): void
    {
        $this->attributes['region_id'] = $value;
    }

    public function city(): BelongsTo
    {
        return $this->belongsTo(City::class, 'city_id');
    }

    public function activityLogs(): HasMany
    {
        return $this->hasMany(ActivityLog::class)->latest();
    }

    /**
     * Override default password reset notification.
     */
    public function sendPasswordResetNotification($token)
    {
        $resetUrl = url(route('password.reset', [
            'token' => $token,
            'email' => $this->getEmailForPasswordReset(),
        ], false));

        app(\App\Services\EmailService::class)->sendPasswordResetEmail($this, $resetUrl);
    }

    /**
     * Role Parsing Helpers
     */
    public function isAdmin(): bool
    {
        $this->loadMissing('roles', 'role');

        if ($this->roles->contains(fn (Role $role) => $role->slug === 'admin')) {
            return true;
        }

        if (is_string($this->role)) {
            return strtolower($this->role) === 'admin';
        }

        if ($this->role) {
            return ($this->role->slug ?? $this->role->name ?? '') === 'admin';
        }

        return false;
    }

    /**
     * @return list<string>
     */
    public function permissionSlugs(): array
    {
        if ($this->isAdmin()) {
            return \App\Support\PermissionCatalog::allSlugs();
        }

        return $this->getAllPermissions()->pluck('name')->values()->all();
    }

    public function canAccessAdminPanel(): bool
    {
        return $this->isAdmin() || $this->hasPermissionTo('access_admin', PermissionCatalog::GUARD);
    }

    public function getPhoneAttribute(): ?string
    {
        return $this->mobile;
    }

    public function isPractitioner(): bool
    {
        if (is_string($this->role)) {
            return strtolower($this->role) === 'practitioner';
        }
        if (is_object($this->role)) {
            return ($this->role->slug ?? $this->role->name ?? '') === 'practitioner';
        }
        return false;
    }
}