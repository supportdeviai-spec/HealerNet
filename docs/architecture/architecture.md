# 🏛️ HealerNet Architecture Specification

## Overview

**HealerNet** is built using a modern enterprise architecture based on **Laravel 13, React.js, Docker, Redis, and MySQL**.

The application follows:
- **Clean Architecture**
- **SOLID Principles**
- **Repository Pattern**
- **Service Layer Pattern**
- **Dependency Injection**
- **Event-Driven Architecture**

---

# System Architecture

```
+-----------------------------------------------------------------------+
|                             CLIENT LAYER                              |
|   React.js  |  Tailwind CSS  |  Axios  |  React Router / Blade-Inertia |
+-----------------------------------------------------------------------+
                                   | (HTTPS / REST / JSON)
                                   v
+-----------------------------------------------------------------------+
|                            BACKEND LAYER                              |
|   Laravel 13 | Sanctum Auth | Controller | Service Layer | Repository |
+-----------------------------------------------------------------------+
          |                        |                        |
          v                        v                        v
+------------------+     +------------------+     +-------------------+
|  DATABASE LAYER  |     |   CACHE / QUEUE  |     | EXTERNAL SERVICES |
|   MySQL 8.0      |     |  Redis Cache     |     | SMTP / SES        |
|  (Relational)    |     |  Redis Queues    |     | WhatsApp API      |
+------------------+     +------------------+     +-------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
|                         INFRASTRUCTURE LAYER                          |
|         Docker  |  Docker Compose  |  Nginx  |  PHP 8.3 FPM         |
+-----------------------------------------------------------------------+
```

---

# Architecture Layers

### 1. Client Layer
- **React.js / Tailwind CSS / Inertia.js**
- Standardized UI Theme using HealerNet Design System colors:
  - Primary Green: `#3F8F2D`
  - Forest Green: `#0D5F54`
  - Light Green: `#8CC63E`
  - Gold: `#C8A24D`

### 2. Backend Layer
- **Laravel 13 Framework**
- **Sanctum Authentication** (Mobile OTP & Session tokens)
- **Repository Pattern & Service Layer**
- Form Validation, Policy Authorization, Observer Pattern, Event Dispatchers.

### 3. Database & Caching Layer
- **MySQL:** Core relational data (Users, Practitioners, Consultations, Articles, Evidence Studies).
- **Redis:** Session storage, cache tags, real-time queue processing.

### 4. Deployment & Infrastructure
```
GitHub  --->  GitHub Actions CI/CD  --->  Docker Build  --->  AWS EC2 / Nginx  --->  Laravel App
```

---

# Design Patterns & SOLID Principles

- **Repository Pattern:** Decouples database queries from business logic.
- **Service Layer:** Encapsulates core domain business rules.
- **Observer Pattern:** Triggers background notifications and logs on entity changes.
- **Strategy Pattern:** Plugable provider interfaces (e.g. Payment gateways, SMS/WhatsApp gateways).
- **SOLID Principles:** Single Responsibility, Open-Closed, Liskov Substitution, Interface Segregation, Dependency Inversion.

---

# Future Roadmap

1. **Mobile Application (React Native)**
2. **AI Healing Assistant & Evidence Summarizer**
3. **Telehealth Video Consultation System**
4. **Multi-language Support (i18n)**
5. **Practitioner Analytics & Research Dashboard**
