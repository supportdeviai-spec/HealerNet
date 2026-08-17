# 🐳 Docker Setup Guide

## Local Development Containers

HealerNet provides a complete Docker Compose environment for local development.

---

## Database persistence (important)

MySQL data is stored in a **named Docker volume**:

| Volume | Purpose |
| :--- | :--- |
| `healernet_mysql_data` | All app data (users, locations, WhatsApp groups, etc.) |
| `healernet_redis_data` | Redis cache/queue data |

### Safe commands — data is kept

```bash
# Recommended helpers
./docker/up.sh
./docker/down.sh

# Or standard compose (without -v)
docker compose up -d
docker compose down
docker compose restart
docker compose stop
docker compose start
```

These commands **do not delete** your database rows.

### Dangerous command — deletes everything

```bash
# NEVER use -v unless you intentionally want a blank database
docker compose down -v
```

`-v` removes volumes, including `healernet_mysql_data`.

---

## First boot / empty database

On container start, the app entrypoint:

1. Runs `php artisan migrate --force` (safe — only adds new tables/columns)
2. If the database is **empty**, runs full `php artisan db:seed --force`
3. If data **already exists**, keeps it and only refreshes CMS pages

So after a new volume or first install, data is seeded automatically.

Default admin after seed:

- Email: `admin@healernet.org`
- Password: `Admin@123`

---

## Common commands

```bash
# Build and start (keeps DB volume)
docker compose up -d --build

# Stop containers (keeps DB volume)
docker compose down

# Run migrations manually (safe)
docker compose exec app php artisan migrate --force

# Re-seed if tables are empty (safe — uses firstOrCreate/updateOrCreate)
docker compose exec app php artisan db:seed --force

# View logs
docker compose logs -f app
```

---

## Tests and the live database

PHPUnit uses a **separate** database: `healernet_testing`.

Running tests must **not** wipe `healernet`. See `tests/TestCase.php` and `.env.testing`.

---

## URLs

| Service | URL |
| :--- | :--- |
| App | http://localhost:8000 |
| Vite | http://localhost:5173 |
| phpMyAdmin | http://localhost:8080 |
| Mailpit | http://localhost:8025 |

---

# 🌐 Live domain (healernet.org)

Full production steps (DNS, SSL, Docker Compose production stack, deploys):

**[docs/deployment/live-server.md](live-server.md)**

Quick start on the VPS:

```bash
cp .env.production.example .env   # edit passwords, APP_KEY, SMTP
./docker/prod-up.sh
./docker/issue-ssl.sh             # after DNS A records point here
```

| Service | Production URL |
| :--- | :--- |
| App | https://healernet.org |
| Health | https://healernet.org/api/health |
| Laravel up | https://healernet.org/up |

Do **not** run `./docker/up.sh` (local Vite / phpMyAdmin / Mailpit) on the live server.

---

# ☁️ AWS Deployment Guide

## Architecture Summary
- **Compute:** AWS EC2 running Docker Compose / ECS.
- **Database:** AWS Aurora MySQL 8.0 Multi-AZ.
- **Cache:** AWS ElastiCache Redis cluster.
- **Media/Assets:** AWS S3 Bucket with CloudFront CDN.

---

# 🔑 Environment Variables Reference

| Variable | Description | Default |
| :--- | :--- | :--- |
| `APP_NAME` | Application Name | `HealerNet` |
| `APP_ENV` | Environment stage | `local` / `production` |
| `DB_CONNECTION` | Primary Database | `mysql` |
| `REDIS_HOST` | Redis Server Host | `127.0.0.1` / `redis` |
| `SANCTUM_STATEFUL_DOMAINS` | Allowed stateful CORS | `localhost:3000,healernet.org` |
