#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "Stopping HealerNet production containers (keeping database volume healernet_mysql_data)..."
docker compose -f docker-compose.prod.yml down "$@"

echo ""
echo "Database data was NOT deleted."
echo "Start again: ./docker/prod-up.sh"
echo ""
echo "WARNING: docker compose -f docker-compose.prod.yml down -v deletes ALL database data permanently."
