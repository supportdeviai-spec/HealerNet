<?php

/**
 * Production release gate — run inside app container:
 *   php scripts/production_release_gate.php
 */

require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Banner;
use App\Models\EmailTemplate;
use App\Support\BannerPages;
use App\Http\Controllers\BannerController;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

$pass = 0;
$fail = 0;
$warn = 0;

function ok(bool $cond, string $label, bool $warning = false): void
{
    global $pass, $fail, $warn;
    if ($cond) {
        $pass++;
        echo "PASS  {$label}\n";
        return;
    }
    if ($warning) {
        $warn++;
        echo "WARN  {$label}\n";
        return;
    }
    $fail++;
    echo "FAIL  {$label}\n";
}

echo "=== HealerNet production release gate ===\n";
echo 'Time: ' . now()->toIso8601String() . "\n\n";

echo "--- Environment ---\n";
$env = config('app.env');
$debug = (bool) config('app.debug');
$key = (string) config('app.key');
ok($key !== '' && str_starts_with($key, 'base64:'), 'APP_KEY is set');
ok(in_array($env, ['production', 'staging', 'local', 'testing'], true), "APP_ENV={$env}");
if ($env === 'production') {
    ok($debug === false, 'APP_DEBUG=false in production');
} else {
    ok(true, "APP_DEBUG=" . ($debug ? 'true' : 'false') . " (non-production env)", true);
}
ok((string) config('app.url') !== '', 'APP_URL is set: ' . config('app.url'));

echo "\n--- Database ---\n";
try {
    DB::connection()->getPdo();
    ok(true, 'Database connection OK');
} catch (Throwable $e) {
    ok(false, 'Database connection failed: ' . $e->getMessage());
}

$tables = ['users', 'banners', 'email_templates', 'cities', 'whatsapp_groups', 'city_whatsapp_groups'];
foreach ($tables as $table) {
    ok(Schema::hasTable($table), "Table exists: {$table}");
}

$pending = [];
try {
    $migrator = app('migrator');
    $files = $migrator->getMigrationFiles(database_path('migrations'));
    $ran = $migrator->getRepository()->getRan();
    foreach (array_keys($files) as $name) {
        if (!in_array($name, $ran, true)) {
            $pending[] = $name;
        }
    }
} catch (Throwable $e) {
    $pending[] = 'could-not-check:' . $e->getMessage();
}
ok(count($pending) === 0, count($pending) === 0 ? 'No pending migrations' : 'Pending: ' . implode(', ', $pending));

echo "\n--- Storage / banners ---\n";
ok(Storage::disk('public')->exists('.') || is_dir(storage_path('app/public')), 'Public disk path exists');
ok(is_link(public_path('storage')) || is_dir(public_path('storage')), 'public/storage link/dir exists');
ok(is_dir(storage_path('app/public/banners')), 'storage/app/public/banners exists');

$controller = app(BannerController::class);
foreach (BannerPages::ALL as $page) {
    $payload = $controller->getForPage($page)->getData(true);
    $rows = $payload['data'] ?? [];
    ok(($payload['status'] ?? null) === 'success', "Banner API {$page} OK (" . count($rows) . ')');
}

$activeBanners = Banner::active()->count();
ok($activeBanners >= 1, "Active banners in DB: {$activeBanners}");

echo "\n--- Email / welcome ---\n";
$welcome = EmailTemplate::query()->where('slug', EmailTemplate::SLUG_WELCOME)->first();
ok((bool) $welcome, 'Welcome email template exists');
ok($welcome?->is_active !== false, 'Welcome email template active', true);

echo "\n--- Routes (critical) ---\n";
$routes = collect(app('router')->getRoutes())->map(fn ($r) => $r->uri())->all();
foreach ([
    'api/banners/{page}',
    'api/admin/banners',
    'api/auth/login',
    'api/auth/register',
] as $needle) {
    $found = false;
    foreach ($routes as $uri) {
        if ($uri === $needle || str_contains($uri, str_replace('{page}', '', $needle))) {
            // loose match
        }
        if ($uri === $needle) {
            $found = true;
            break;
        }
    }
    // Fallback contains check
    if (!$found) {
        foreach ($routes as $uri) {
            if (str_starts_with($needle, 'api/') && str_contains($uri, trim(str_replace(['api/', '{page}'], ['', ''], $needle), '/'))) {
                if (str_contains($uri, 'banners') && str_contains($needle, 'banners')) {
                    $found = true;
                    break;
                }
                if (str_contains($uri, 'auth/login') && str_contains($needle, 'auth/login')) {
                    $found = true;
                    break;
                }
                if (str_contains($uri, 'auth/register') && str_contains($needle, 'auth/register')) {
                    $found = true;
                    break;
                }
                if (str_contains($uri, 'admin/banners') && str_contains($needle, 'admin/banners')) {
                    $found = true;
                    break;
                }
            }
        }
    }
    ok($found, "Route present: {$needle}");
}

echo "\n--- Frontend build assets ---\n";
$manifest = public_path('build/manifest.json');
ok(is_file($manifest), 'Vite production manifest exists (run npm run build)', !is_file($manifest));

echo "\n=== SUMMARY ===\n";
echo "pass={$pass} fail={$fail} warn={$warn}\n";
if ($fail > 0) {
    echo "STATUS: NOT READY — fix FAIL items before release\n";
    exit(1);
}
if ($warn > 0) {
    echo "STATUS: READY WITH WARNINGS — review WARN items for production env\n";
    exit(0);
}
echo "STATUS: READY\n";
exit(0);
