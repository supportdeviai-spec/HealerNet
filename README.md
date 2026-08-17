# 🌿 HealerNet™

> **Global Network for Evidence-Based Healing**  
> *Connect • Collaborate • Heal • Transform*

---

## 📖 Overview

**HealerNet** is a modern enterprise web application bridging ancient wisdom with evidence-based medicine. Built with Laravel 13, React.js, Tailwind CSS, Docker, Redis, and MySQL, HealerNet enables seamless collaboration between holistic health practitioners, evidence researchers, and patients.

---

## 🎨 Brand Colors & Design System

- **Primary Green:** `#3F8F2D`
- **Forest Green:** `#0D5F54`
- **Light Green:** `#8CC63E`
- **Gold:** `#C8A24D`
- **White:** `#FFFFFF`
- **Dark Gray:** `#374151`

For complete brand guidelines, accessibility contrast targets, and component specifications, see [docs/brand-guidelines.md](docs/brand-guidelines.md).

---

## 🏛️ System Architecture

HealerNet adheres to Clean Architecture, SOLID Principles, and the Repository Pattern:

```
[ Client Layer (React/Tailwind) ] <---> [ Laravel 13 API / Sanctum ] <---> [ MySQL 8.0 & Redis ]
```

Detailed architecture specifications:
- [System Architecture Specification](docs/architecture/architecture.md)
- [Clean Architecture Layering](docs/architecture/clean-architecture.md)
- [Authentication Flow (OTP & Sanctum)](docs/architecture/authentication-flow.md)
- [Docker Container Topology](docs/architecture/docker-architecture.md)
- [Deployment & Infrastructure](docs/architecture/deployment-architecture.md)
- [CI/CD Pipeline](docs/architecture/ci-cd-pipeline.md)
- [Database ERD](docs/architecture/database-erd.md)

---

## 📂 Documentation Directory

| Category | Document Link | Description |
| :--- | :--- | :--- |
| **Brand Guidelines** | [brand-guidelines.md](docs/brand-guidelines.md) | Colors, typography, spacing & UI components |
| **Architecture** | [architecture/](docs/architecture/architecture.md) | System diagrams, clean architecture & SOLID design |
| **API Endpoints** | [api/](docs/api/authentication-api.md) | REST API reference for Auth, Users, Practitioners & Consultations |
| **Deployment** | [deployment/](docs/deployment/docker-setup.md) | Docker Compose, live domain (healernet.org), AWS EC2/Nginx & Environment configuration |
| **Live server** | [live-server.md](docs/deployment/live-server.md) | DNS, SSL, production Compose, deploys |
| **Database** | [database/](docs/database/schema-design.md) | Database schema design, migrations & seeders guide |

---

## 🚀 Quick Start (Local Development)

### 1. Requirements
- PHP 8.3+
- Composer 2+
- Node.js 20+ & npm
- Docker & Docker Compose (Optional)

### 2. Environment & Dependency Setup
```bash
# Clone the repository
git clone https://github.com/your-org/healernet.git
cd healernet

# Install PHP and Node dependencies
composer install
npm install

# Setup environment variables
cp .env.example .env
php artisan key:generate

# Run migrations and seed database
php artisan migrate --seed
```

### 3. Start Development Servers
```bash
npm run dev
```

---

## 📜 License
Licensed under the [MIT License](LICENSE).
