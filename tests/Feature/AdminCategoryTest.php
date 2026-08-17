<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Role;
use App\Models\User;
use App\Models\WhatsAppGroup;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminCategoryTest extends TestCase
{
    use RefreshDatabase;

    protected function createAdmin(): User
    {
        $role = Role::create(['name' => 'Admin', 'slug' => 'admin']);

        return User::factory()->create(['role_id' => $role->id]);
    }

    public function test_admin_can_create_category_with_same_name_after_delete(): void
    {
        Sanctum::actingAs($this->createAdmin());

        $category = Category::create([
            'name' => 'testnew',
            'description' => 'test',
            'status' => 'active',
        ]);

        $this->deleteJson("/api/admin/categories/{$category->id}")
            ->assertOk()
            ->assertJsonPath('status', 'success');

        $category->refresh();
        $this->assertNotNull($category->deleted_at);
        $this->assertNotSame('testnew', $category->name);
        $this->assertNotSame('testnew', $category->slug);

        $this->postJson('/api/admin/categories', [
            'name' => 'testnew',
            'description' => 'test',
            'status' => 'active',
        ])
            ->assertCreated()
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.name', 'testnew');

        $this->assertDatabaseHas('categories', [
            'name' => 'testnew',
            'slug' => 'testnew',
            'deleted_at' => null,
        ]);
        $this->assertTrue(Category::onlyTrashed()->where('id', $category->id)->exists());
    }

    public function test_admin_cannot_delete_category_with_whatsapp_groups(): void
    {
        Sanctum::actingAs($this->createAdmin());

        $category = Category::create([
            'name' => 'Yoga & Movement',
            'status' => 'active',
        ]);

        WhatsAppGroup::create([
            'category_id' => $category->id,
            'name' => 'Yoga Group',
            'whatsapp_url' => 'https://chat.whatsapp.com/example',
            'max_members' => 250,
            'current_members' => 0,
            'status' => 'active',
        ]);

        $this->deleteJson("/api/admin/categories/{$category->id}")
            ->assertStatus(409);

        $this->assertDatabaseHas('categories', [
            'id' => $category->id,
            'name' => 'Yoga & Movement',
            'deleted_at' => null,
        ]);
    }
}
