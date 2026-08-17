# Live server setup — healernet.org

Use this guide on the **production VPS** after DNS for `healernet.org` and `www.healernet.org` points at the server.

Local development is unchanged: `./docker/up.sh` still serves http://localhost:8000.

---

## 1. DNS (domain registrar)

Create these records and wait until they resolve to the server public IP:

| Type | Host | Value |
| :--- | :--- | :--- |
| A | `@` | your server IPv4 |
| A | `www` | your server IPv4 |

Optional:

| Type | Host | Value |
| :--- | :--- | :--- |
| AAAA | `@` / `www` | your server IPv6 |

Open **TCP 80** and **TCP 443** on the firewall / security group. Do **not** expose MySQL, Redis, or phpMyAdmin.

---

## 2. Server prerequisites

- Docker Engine + Docker Compose v2
- Git
- OpenSSL (`openssl` CLI)

```bash
git clone <your-healernet-repo> /var/www/healernet
cd /var/www/healernet
```

---

## 3. Production environment

```bash
cp .env.production.example .env
```

Edit `.env` and set at least:

| Variable | Required value |
| :--- | :--- |
| `APP_KEY` | run `docker compose -f docker-compose.prod.yml run --rm app php artisan key:generate --show` after first image build, or generate locally |
| `APP_URL` | `https://healernet.org` |
| `APP_DOMAIN` | `healernet.org` |
| `APP_ENV` | `production` |
| `APP_DEBUG` | `false` |
| `DB_PASSWORD` | strong unique password |
| `DB_ROOT_PASSWORD` | strong unique password |
| `MAIL_HOST` / `MAIL_USERNAME` / `MAIL_PASSWORD` | real SMTP (not Mailpit) |
| `SANCTUM_STATEFUL_DOMAINS` | `healernet.org,www.healernet.org` |
| `CORS_ALLOWED_ORIGINS` | `https://healernet.org,https://www.healernet.org` |
| `SESSION_DOMAIN` | `.healernet.org` |
| `SESSION_SECURE_COOKIE` | `true` |

Never copy the local `.env` (Mailtrap, `APP_DEBUG=true`, `localhost`) onto the live server.

---

## 4. First boot

```bash
chmod +x docker/prod-up.sh docker/prod-down.sh docker/issue-ssl.sh docker/renew-ssl.sh docker/deploy.sh
./docker/prod-up.sh
```

This starts:

| Container | Role |
| :--- | :--- |
| `healernet-nginx` | HTTPS reverse proxy (ports 80 + 443) |
| `healernet-app` | Laravel PHP-FPM |
| `healernet-mysql` | MySQL 8 (internal only) |
| `healernet-redis` | Cache, sessions, queues (internal only) |
| `healernet-queue` | Queue worker |
| `healernet-scheduler` | `php artisan schedule:work` |
| `healernet-certbot` | Certificate renewal loop |

Frontend assets are built with `npm run build` (no Vite dev server on production).

Default admin after first empty-database seed:

- Email: `admin@healernet.org`
- Password: `Admin@123` — **change this immediately**

---

## 5. Let's Encrypt SSL

After DNS is live:

```bash
./docker/issue-ssl.sh
```

Certificates are stored in `docker/certbot/conf` (gitignored). Renew:

```bash
./docker/renew-ssl.sh
```

Suggested weekly cron on the host:

```cron
0 3 * * 1 /var/www/healernet/docker/renew-ssl.sh >> /var/log/healernet-ssl.log 2>&1
```

---

## 6. Verify

```bash
curl -I https://healernet.org
curl https://healernet.org/api/health
curl https://healernet.org/up
docker compose -f docker-compose.prod.yml exec app php scripts/production_release_gate.php
```

`/api/health` returns `{ "status": "ok" }` when MySQL is reachable.

---

## 7. Later deploys

```bash
cd /var/www/healernet
./docker/deploy.sh
```

That pulls git, rebuilds containers, installs Composer/npm deps, builds Vite assets, migrates, and caches config/routes/views.

---

## 8. Useful commands

```bash
# Logs
docker compose -f docker-compose.prod.yml logs -f web app queue

# Artisan
docker compose -f docker-compose.prod.yml exec app php artisan about

# Stop (keeps MySQL volume)
./docker/prod-down.sh
```

phpMyAdmin, Vite, and Mailpit are **not** started in production. For database access, use an SSH tunnel:

```bash
ssh -L 3307:127.0.0.1:3306 user@your-server
```

then `docker compose -f docker-compose.prod.yml exec mysql mysql -u healernet_user -p healernet`

---

## 9. What production hardens

- `APP_DEBUG=false`, HTTPS-only cookies, HSTS and security headers
- HTTP → `https://healernet.org` (www redirects to apex)
- Laravel trusts `X-Forwarded-*` so generated URLs stay HTTPS
- Redis for cache, session, and queues
- MySQL and Redis are not published to the public internet
- PHP OPcache with `validate_timestamps=0`
