#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "Stopping HealerNet containers (keeping database volume healernet_mysql_data)..."
docker compose down "$@"

echo ""
echo "Database data was NOT deleted."
echo "To start again: ./docker/up.sh"
echo ""
echo "WARNING: docker compose down -v deletes ALL database data permanently."
