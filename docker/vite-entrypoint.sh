#!/bin/sh
set -e

cd /var/www/html

echo "[vite] Installing/updating npm dependencies..."
npm install --legacy-peer-deps --ignore-scripts

# Remove stale hot file so Laravel does not point at a dead Vite server during boot
rm -f /var/www/html/public/hot

echo "[vite] Starting Vite dev server on 0.0.0.0:5173..."
exec npm run dev
