#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "Starting HealerNet (database volume is preserved)..."
docker compose up -d --build "$@"

echo ""
echo "MySQL data is stored in Docker volume: healernet_mysql_data"
echo "Safe restart later: ./docker/down.sh && ./docker/up.sh"
echo "App: http://localhost:8000 | phpMyAdmin: http://localhost:8080"
