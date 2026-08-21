<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WhatsAppCommunityImport extends Model
{
    protected $table = 'whatsapp_community_imports';

    protected $fillable = [
        'user_id',
        'file_name',
        'status',
        'total_rows',
        'created_count',
        'updated_count',
        'skipped_count',
        'error_count',
        'conflict_count',
        'summary',
        'issues',
        'imported_at',
    ];

    protected function casts(): array
    {
        return [
            'summary' => 'array',
            'issues' => 'array',
            'imported_at' => 'datetime',
            'total_rows' => 'integer',
            'created_count' => 'integer',
            'updated_count' => 'integer',
            'skipped_count' => 'integer',
            'error_count' => 'integer',
            'conflict_count' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
