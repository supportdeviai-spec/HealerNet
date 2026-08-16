# 🗄️ Database Schema & Migrations Guide

## Database Overview
HealerNet utilizes **MySQL 8.0** with InnoDB storage engine, foreign key integrity, and UTF8MB4 charset for complete internationalization support.

---

## Key Tables

1. `users`: Stores user identity, authentication status, and core roles (`admin`, `practitioner`, `patient`).
2. `practitioners`: Stores professional accreditation, medical license numbers, specialties, and verification state.
3. `consultations`: Manages appointment slots, session notes, statuses, and pricing.
4. `evidence_studies`: Contains curated research papers, DOIs, abstract summaries, and outcome metrics.

---

## Migration Commands

```bash
# Run pending migrations
php artisan migrate

# Rollback last batch
php artisan migrate:rollback

# Reset and seed database
php artisan migrate:fresh --seed
```

---

## Database Seeders

- `DatabaseSeeder.php`: Main entry point calling domain seeders.
- `RoleAndPermissionSeeder.php`: Seeds base roles and authorization guards.
- `PractitionerCategorySeeder.php`: Seeds holistic disciplines (Naturopathy, Herbalism, Ayurveda, Integrative Oncology).
