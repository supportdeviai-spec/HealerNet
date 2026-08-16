<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmailTemplate extends Model
{
    public const SLUG_WELCOME = 'welcome-email';

    public const SLUG_OTP = 'otp-verification';

    public const SLUG_PASSWORD_RESET = 'password-reset';

    public const SLUG_ANNOUNCEMENT = 'announcement';

    protected $fillable = [
        'name',
        'slug',
        'subject',
        'description',
        'body',
        'variables',
        'is_active',
        'is_system',
    ];

    protected $casts = [
        'variables' => 'array',
        'is_active' => 'boolean',
        'is_system' => 'boolean',
    ];
}
