<?php

namespace Tests\Feature;

use App\Models\EmailTemplate;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\EmailTemplateSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class EmailTemplateTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['mail.default' => 'array']);
    }

    protected function createAdmin(): User
    {
        $role = Role::create(['name' => 'Admin', 'slug' => 'admin']);

        return User::factory()->create(['role_id' => $role->id]);
    }

    public function test_admin_can_list_email_templates(): void
    {
        Sanctum::actingAs($this->createAdmin());
        $this->seed(EmailTemplateSeeder::class);

        $response = $this->getJson('/api/admin/email-templates');

        $response->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonStructure(['data' => [['id', 'name', 'slug', 'subject', 'body']]]);
    }

    public function test_admin_can_create_custom_email_template(): void
    {
        Sanctum::actingAs($this->createAdmin());

        $response = $this->postJson('/api/admin/email-templates', [
            'name' => 'Follow Up Email',
            'slug' => 'follow-up-email',
            'subject' => 'Hello {{name}}',
            'description' => 'Custom follow up',
            'body' => 'Thanks for joining HealerNet, {{name}}.',
            'variables' => ['name', 'email'],
            'is_active' => true,
        ]);

        $response->assertCreated()
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.slug', 'follow-up-email');

        $this->assertDatabaseHas('email_templates', [
            'slug' => 'follow-up-email',
            'is_system' => false,
        ]);
    }

    public function test_admin_can_update_email_template(): void
    {
        Sanctum::actingAs($this->createAdmin());
        $this->seed(EmailTemplateSeeder::class);

        $template = EmailTemplate::where('slug', EmailTemplate::SLUG_OTP)->firstOrFail();

        $response = $this->putJson("/api/admin/email-templates/{$template->id}", [
            'subject' => 'Updated OTP Subject {{code}}',
            'body' => 'Your code is {{code}}',
        ]);

        $response->assertOk()->assertJsonPath('data.subject', 'Updated OTP Subject {{code}}');
    }

    public function test_admin_can_preview_email_template(): void
    {
        Sanctum::actingAs($this->createAdmin());
        $this->seed(EmailTemplateSeeder::class);

        $template = EmailTemplate::where('slug', EmailTemplate::SLUG_OTP)->firstOrFail();

        $response = $this->postJson("/api/admin/email-templates/{$template->id}/preview", []);

        $response->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonStructure(['data' => ['subject', 'html']]);

        $this->assertStringContainsString('/images/logo.png', $response->json('data.html'));
        $this->assertStringNotContainsString('cid:healernet-logo', $response->json('data.html'));
    }

    public function test_admin_can_preview_draft_template(): void
    {
        Sanctum::actingAs($this->createAdmin());

        $response = $this->postJson('/api/admin/email-templates/preview-draft', [
            'slug' => 'custom-draft',
            'subject' => 'Hello {{name}}',
            'body' => 'Welcome {{name}} to HealerNet.',
        ]);

        $response->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonStructure(['data' => ['subject', 'html']]);
    }

    public function test_sent_email_templates_embed_logo_instead_of_localhost_url(): void
    {
        $this->seed(EmailTemplateSeeder::class);

        $rendered = app(\App\Services\TemplateRendererService::class)->render(
            EmailTemplate::SLUG_OTP,
            ['code' => '1234', 'email' => 'admin@healernet.org']
        );

        $this->assertStringContainsString('cid:healernet-logo', $rendered['html']);
        $this->assertStringNotContainsString('localhost:8000/images/logo.png', $rendered['html']);
        $this->assertStringContainsString('alt="HealerNet Logo"', $rendered['html']);
    }

    public function test_admin_can_send_test_email(): void
    {
        Sanctum::actingAs($this->createAdmin());
        $this->seed(EmailTemplateSeeder::class);

        $template = EmailTemplate::where('slug', EmailTemplate::SLUG_OTP)->firstOrFail();

        $response = $this->postJson("/api/admin/email-templates/{$template->id}/test-send", [
            'recipient' => 'admin@healernet.org',
        ]);

        $response->assertOk()->assertJsonPath('status', 'success');
    }

    public function test_admin_can_delete_custom_template_but_not_system_template(): void
    {
        Sanctum::actingAs($this->createAdmin());
        $this->seed(EmailTemplateSeeder::class);

        $custom = EmailTemplate::create([
            'name' => 'Temp',
            'slug' => 'temp-template',
            'subject' => 'Temp',
            'body' => 'Temp body',
            'is_active' => true,
            'is_system' => false,
        ]);

        $this->deleteJson("/api/admin/email-templates/{$custom->id}")
            ->assertOk();

        $system = EmailTemplate::where('slug', EmailTemplate::SLUG_WELCOME)->firstOrFail();

        $this->deleteJson("/api/admin/email-templates/{$system->id}")
            ->assertForbidden();
    }
}
