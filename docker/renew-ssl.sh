#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

COMPOSE=(docker compose -f docker-compose.prod.yml)

echo "Renewing Let's Encrypt certificates..."
"${COMPOSE[@]}" run --rm --entrypoint certbot certbot renew --webroot -w /var/www/certbot --quiet || true
"${COMPOSE[@]}" exec -T web nginx -s reload
echo "Nginx reloaded."
