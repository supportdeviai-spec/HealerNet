<?php

namespace App\Repositories\Contracts;

use App\Models\Page;
use Illuminate\Database\Eloquent\Collection;

interface PageRepositoryInterface
{
    public function getBySlug(string $slug): ?Page;
    public function getAllPages(): Collection;
    public function updatePage(int $id, array $data): Page;
}