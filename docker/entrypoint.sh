#!/bin/sh
set -e

cd /var/www/html

mkdir -p storage/framework/cache/data \
         storage/framework/sessions \
         storage/framework/views \
         storage/logs \
         storage/app/public/banners \
         public/banner/uploads \
         bootstrap/cache

if [ ! -f .env ]; then
    echo "[entrypoint] Creating .env from .env.example..."
    cp .env.example .env
fi

chown -R www-data:www-data storage bootstrap/cache storage/app/public public/banner 2>/dev/null || true
chmod -R 775 storage bootstrap/cache storage/app/public public/banner 2>/dev/null || true

# Ensure public/storage symlink exists for uploaded banners
if [ ! -e public/storage ]; then
    php artisan storage:link --force --no-interaction 2>/dev/null || \
      ln -sfn /var/www/html/storage/app/public /var/www/html/public/storage || true
fi

# Bootstrap Laravel on app container only
if [ "$1" = "php-fpm" ]; then
    echo "[entrypoint] Bootstrapping Laravel..."

    if ! grep -q "^APP_KEY=base64:" .env 2>/dev/null; then
        php artisan key:generate --force --no-interaction || true
    fi

    php artisan config:clear --no-interaction || true
    if [ "${APP_ENV:-local}" != "production" ]; then
        php artisan cache:clear --no-interaction || true
    fi

    echo "[entrypoint] Running migrations (safe — does not delete existing rows)..."
    if ! php artisan migrate --force --no-interaction; then
        echo "[entrypoint] WARNING: migrate failed — check DB_HOST/DB credentials"
    fi

    COUNTRY_COUNT=$(php artisan tinker --execute="echo App\\Models\\Country::count();" 2>/dev/null || echo "0")

    if [ "$COUNTRY_COUNT" = "0" ]; then
        echo "[entrypoint] Empty database detected — running full seed (first boot or new volume)..."
        if ! php artisan db:seed --force --no-interaction; then
            echo "[entrypoint] WARNING: DatabaseSeeder failed"
        else
            echo "[entrypoint] Database seeded successfully."
        fi
    else
        echo "[entrypoint] Existing database detected ($COUNTRY_COUNT countries) — keeping persisted data."
        if ! php artisan db:seed --class=PageSeeder --force --no-interaction; then
            echo "[entrypoint] WARNING: PageSeeder failed"
        fi
    fi

    PAGE_COUNT=$(php artisan tinker --execute="echo App\\Models\\Page::count();" 2>/dev/null || echo "?")
    USER_COUNT=$(php artisan tinker --execute="echo App\\Models\\User::count();" 2>/dev/null || echo "?")
    echo "[entrypoint] Database ready — users: ${USER_COUNT}, pages: ${PAGE_COUNT}"
    echo "[entrypoint] MySQL data persists in Docker volume: healernet_mysql_data"

    if [ "${APP_ENV:-local}" = "production" ]; then
        echo "[entrypoint] Caching config, routes, and views..."
        php artisan config:cache --no-interaction || true
        php artisan route:cache --no-interaction || true
        php artisan view:cache --no-interaction || true
        php artisan event:cache --no-interaction || true
        rm -f public/hot
    fi
fi

exec "$@"
