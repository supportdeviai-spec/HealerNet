# 🐳 Docker Architecture & Container Setup

## Container Topology

```
+---------------------------------------------------------------+
|                       DOCKER CONTAINER NETWORK                |
|                                                               |
|  +--------------------+             +----------------------+  |
|  | nginx-server       | ----------> | app-laravel (FPM)    |  |
|  | Port 80 / 443      |             | PHP 8.3              |  |
|  +--------------------+             +----------------------+  |
|                                                |              |
|               +--------------------------------+              |
|               |                |                              |
|               v                v                              |
|  +--------------------+  +-------------------+                |
|  | mysql-db           |  | redis-cache-queue |                |
|  | Port 3306          |  | Port 6379         |                |
|  +--------------------+  +-------------------+                |
+---------------------------------------------------------------+
```

## Service Definition
1. **app (Laravel PHP-FPM 8.3):** Handles core request processing and artisan commands.
2. **nginx:** Web server routing static files and proxies PHP execution to `app:9000`.
3. **mysql (MySQL 8.0):** Primary database storage.
4. **redis:** In-memory caching, session store, and queue handling.
5. **mailpit (Dev only):** Local SMTP email testing interface.
