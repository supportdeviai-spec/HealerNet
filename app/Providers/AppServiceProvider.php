<?php

namespace App\Providers;

use App\Events\UserRegistered;
use App\Listeners\NotifyAdminsOnPasswordReset;
use App\Listeners\NotifyAdminsOnUserRegistered;
use App\Listeners\SendWelcomeEmailListener;
use App\Models\User;
use App\Observers\UserRoleObserver;
use Illuminate\Auth\Events\PasswordReset;
use App\Repositories\Contracts\LocationRepositoryInterface;
use App\Repositories\Contracts\PageRepositoryInterface;
use App\Repositories\Contracts\UserDashboardRepositoryInterface;
use App\Repositories\Eloquent\LocationRepository;
use App\Repositories\Eloquent\PageRepository;
use App\Repositories\Eloquent\UserDashboardRepository;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(PageRepositoryInterface::class, PageRepository::class);
        $this->app->bind(LocationRepositoryInterface::class, LocationRepository::class);
        $this->app->bind(UserDashboardRepositoryInterface::class, UserDashboardRepository::class);
    }

    public function boot(): void
    {
        $this->configureMailTransport();
        $this->configureAuthorization();

        User::observe(UserRoleObserver::class);

        Event::listen(
            UserRegistered::class,
            SendWelcomeEmailListener::class
        );

        Event::listen(
            UserRegistered::class,
            NotifyAdminsOnUserRegistered::class
        );

        Event::listen(
            PasswordReset::class,
            NotifyAdminsOnPasswordReset::class
        );
    }

    /**
     * Laravel 12 uses MAIL_URL / MAIL_SCHEME. Build a Symfony mailer DSN when legacy
     * MAIL_ENCRYPTION is set so Mailtrap/Gmail TLS settings in .env still work.
     */
    protected function configureMailTransport(): void
    {
        if (env('MAIL_URL')) {
            return;
        }

        $host = env('MAIL_HOST');
        if (!$host || in_array($host, ['null', '127.0.0.1', 'localhost'], true) && !env('MAIL_PORT')) {
            return;
        }

        $port = (int) env('MAIL_PORT', 587);
        $encryption = env('MAIL_ENCRYPTION');
        $username = env('MAIL_USERNAME');
        $password = env('MAIL_PASSWORD');

        if (!$encryption || in_array($encryption, ['null', 'false', ''], true)) {
            if ($username && $password && $username !== 'null' && $password !== 'null') {
                $auth = rawurlencode($username) . ':' . rawurlencode($password) . '@';
                config(['mail.mailers.smtp.url' => "smtp://{$auth}{$host}:{$port}"]);
            }

            return;
        }

        $scheme = $encryption === 'ssl' ? 'smtps' : 'smtp';
        $auth = ($username && $password && $username !== 'null' && $password !== 'null')
            ? rawurlencode($username) . ':' . rawurlencode($password) . '@'
            : '';
        $query = $encryption === 'tls' ? '?encryption=tls' : '';

        config(['mail.mailers.smtp.url' => "{$scheme}://{$auth}{$host}:{$port}{$query}"]);
    }

    protected function configureAuthorization(): void
    {
        Gate::before(function ($user, $ability) {
            if ($user instanceof User && $user->isAdmin()) {
                return true;
            }

            return null;
        });
    }
}