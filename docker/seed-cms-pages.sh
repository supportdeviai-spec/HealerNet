#!/usr/bin/env bash
# Seed / repair CMS pages in Docker. Run from project root: bash docker/seed-cms-pages.sh
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> Seeding CMS pages..."
docker compose exec -T app php artisan migrate --force
docker compose exec -T app php artisan db:seed --class=PageSeeder --force
docker compose exec -T app php artisan config:clear

echo "==> Pages in database:"
docker compose exec -T app php artisan tinker --execute="App\\Models\\Page::select('id','slug','status')->get()->each(fn(\$p)=>print(\$p->slug.' ['.\$p->status.']'.PHP_EOL));"

echo "==> API check (privacy-policy):"
curl -s "http://localhost:8000/api/pages/privacy-policy" | head -c 400
echo ""
