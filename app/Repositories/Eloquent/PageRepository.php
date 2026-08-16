<?php

namespace App\Repositories\Eloquent;

use App\Models\Page;
use App\Repositories\Contracts\PageRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;

class PageRepository implements PageRepositoryInterface
{
    public function getBySlug(string $slug): ?Page
    {
        return Page::published()->where('slug', $slug)->first();
    }

    public function getAllPages(): Collection
    {
        return Page::all();
    }

    public function updatePage(int $id, array $data): Page
    {
        $page = Page::findOrFail($id);
        $page->update($data);
        return $page;
    }
}