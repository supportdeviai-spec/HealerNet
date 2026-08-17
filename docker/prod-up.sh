#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

COMPOSE=(docker compose -f docker-compose.prod.yml)
DOMAIN="${APP_DOMAIN:-healernet.org}"
CERT_DIR="$ROOT/docker/certbot/conf/live/${DOMAIN}"

if [[ ! -f .env ]]; then
  echo "Missing .env — copy .env.production.example first:"
  echo "  cp .env.production.example .env"
  echo "  Then set APP_KEY, DB_PASSWORD, DB_ROOT_PASSWORD, and mail credentials."
  exit 1
fi

if docker ps --format '{{.Names}}' | grep -qx 'healernet-vite'; then
  echo "Local development stack is running. Stop it first:"
  echo "  ./docker/down.sh"
  exit 1
fi

mkdir -p "$ROOT/docker/certbot/www" "$CERT_DIR"

if [[ ! -f "$CERT_DIR/fullchain.pem" || ! -f "$CERT_DIR/privkey.pem" ]]; then
  echo "Creating temporary TLS certificate for ${DOMAIN} (replaced later by Let's Encrypt)..."
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout "$CERT_DIR/privkey.pem" \
    -out "$CERT_DIR/fullchain.pem" \
    -subj "/CN=${DOMAIN}" >/dev/null 2>&1
fi

echo "Starting HealerNet production stack..."
"${COMPOSE[@]}" up -d --build

echo "Building Vite production assets inside app container..."
"${COMPOSE[@]}" exec -T app sh -c "npm install --legacy-peer-deps --ignore-scripts && npm run build"

echo "Caching Laravel config..."
"${COMPOSE[@]}" exec -T app php artisan config:cache --no-interaction
"${COMPOSE[@]}" exec -T app php artisan route:cache --no-interaction
"${COMPOSE[@]}" exec -T app php artisan view:cache --no-interaction
"${COMPOSE[@]}" exec -T app php artisan event:cache --no-interaction || true

echo ""
echo "Production stack is up."
echo "  Site:  https://${DOMAIN}"
echo "  Health: https://${DOMAIN}/api/health"
echo ""
echo "Issue a real SSL certificate after DNS A records point here:"
echo "  ./docker/issue-ssl.sh"
echo ""
echo "Default admin after first seed:"
echo "  Email:    admin@healernet.org"
echo "  Password: Admin@123"
echo "  Change this password immediately."
