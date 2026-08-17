#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

COMPOSE=(docker compose -f docker-compose.prod.yml)

echo "Deploying HealerNet production update..."

if [[ -d .git ]]; then
  git pull
fi

"${COMPOSE[@]}" up -d --build
"${COMPOSE[@]}" exec -T app sh -c "composer install --no-dev --optimize-autoloader --no-interaction"
"${COMPOSE[@]}" exec -T app sh -c "npm install --legacy-peer-deps --ignore-scripts && npm run build"
"${COMPOSE[@]}" exec -T app php artisan migrate --force --no-interaction
"${COMPOSE[@]}" exec -T app php artisan storage:link --force --no-interaction || true
"${COMPOSE[@]}" exec -T app php artisan config:cache --no-interaction
"${COMPOSE[@]}" exec -T app php artisan route:cache --no-interaction
"${COMPOSE[@]}" exec -T app php artisan view:cache --no-interaction
"${COMPOSE[@]}" exec -T app php artisan event:cache --no-interaction || true
"${COMPOSE[@]}" exec -T app php artisan queue:restart --no-interaction || true

echo ""
echo "Deploy complete. Health check:"
"${COMPOSE[@]}" exec -T app php artisan --version
curl -fsS "https://healernet.org/api/health" || curl -fsS "http://127.0.0.1/api/health" || true
echo ""
