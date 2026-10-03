<?php

namespace App\Events;

use App\Models\User;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class UserRegistered
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public User $user;

    /** @var list<string> */
    public array $categoryIds;

    public function __construct(User $user, array $categoryIds = [])
    {
        $this->user = $user;
        $this->categoryIds = array_values(array_filter($categoryIds));
    }
}
