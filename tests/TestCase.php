<?php

namespace Tests;

use App\Models\Category;
use App\Models\City;
use App\Models\CityWhatsAppGroup;
use App\Models\WhatsAppGroup;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use RuntimeException;

abstract class TestCase extends BaseTestCase
{
    /**
     * Docker Compose injects DB_* env vars into the app container. Without this
     * override, RefreshDatabase runs migrate:fresh on the live healernet DB.
     */
    public function createApplication(): Application
    {
        $this->forceIsolatedTestDatabase();

        $app = parent::createApplication();

        $app['config']->set('queue.default', 'sync');
        $app['config']->set('cache.default', 'array');
        $app['config']->set('app.env', 'testing');

        $database = (string) config('database.connections.mysql.database');
        if ($database === 'healernet') {
            throw new RuntimeException(
                'Refusing to run tests against the healernet development database. '
                . 'Expected healernet_testing — check tests/TestCase.php and phpunit.xml.'
            );
        }

        return $app;
    }

    protected function forceIsolatedTestDatabase(): void
    {
        foreach ([
            'DB_CONNECTION' => 'mysql',
            'DB_DATABASE' => 'healernet_testing',
            'DB_HOST' => 'mysql',
            'DB_PORT' => '3306',
            'DB_USERNAME' => 'healernet_user',
            'DB_PASSWORD' => 'healernet_secret',
            'DB_URL' => '',
            'QUEUE_CONNECTION' => 'sync',
            'CACHE_STORE' => 'array',
            'APP_ENV' => 'testing',
        ] as $key => $value) {
            putenv("{$key}={$value}");
            $_ENV[$key] = $value;
            $_SERVER[$key] = $value;
        }
    }

    protected function createCityWhatsAppMapping(City $city, array $groupOverrides = [], array $mappingOverrides = []): array
    {
        $category = Category::factory()->create(['status' => 'active']);

        $group = WhatsAppGroup::create(array_merge([
            'category_id' => $category->id,
            'name' => 'Test WhatsApp Group',
            'description' => 'Test description',
            'whatsapp_url' => 'https://chat.whatsapp.com/example',
            'max_members' => 250,
            'current_members' => 0,
            'status' => 'active',
        ], $groupOverrides));

        $mapping = CityWhatsAppGroup::create(array_merge([
            'city_id' => $city->id,
            'whatsapp_group_id' => $group->id,
            'display_order' => 1,
            'status' => 'active',
        ], $mappingOverrides));

        return compact('category', 'group', 'mapping');
    }
}
