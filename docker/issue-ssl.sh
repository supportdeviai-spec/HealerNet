#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

COMPOSE=(docker compose -f docker-compose.prod.yml)
DOMAIN="${APP_DOMAIN:-healernet.org}"
EMAIL="${SSL_EMAIL:-support@healernet.org}"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
  DOMAIN="${APP_DOMAIN:-$(echo "${APP_URL:-https://healernet.org}" | sed -E 's#https?://##;s#/.*##')}"
  EMAIL="${SSL_EMAIL:-${MAIL_FROM_ADDRESS:-support@healernet.org}}"
fi

CERT_DIR="$ROOT/docker/certbot/conf/live/${DOMAIN}"

echo "Issuing Let's Encrypt certificate for ${DOMAIN} and www.${DOMAIN}"
echo "Email: ${EMAIL}"
echo "DNS A records for ${DOMAIN} and www.${DOMAIN} must already point to this server."
echo ""

# Dummy self-signed files block certbot from writing the live path.
if [[ -d "$CERT_DIR" ]]; then
  echo "Removing temporary certificate so Let's Encrypt can replace it..."
  rm -rf "$CERT_DIR"
fi

"${COMPOSE[@]}" run --rm --entrypoint certbot certbot certonly \
  --webroot \
  -w /var/www/certbot \
  -d "${DOMAIN}" \
  -d "www.${DOMAIN}" \
  --email "${EMAIL}" \
  --agree-tos \
  --no-eff-email \
  --rsa-key-size 4096 \
  --non-interactive

echo "Reloading nginx..."
"${COMPOSE[@]}" exec -T web nginx -s reload

echo ""
echo "HTTPS is live: https://${DOMAIN}"
