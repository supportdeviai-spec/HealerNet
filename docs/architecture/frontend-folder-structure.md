# HealerNet Enterprise Frontend Directory Structure

```
src/
+-- api/                        # Low-level API client configurations & endpoints definition
¦   +-- axios.instance.ts       # Configured Axios instance with request/response interceptors
¦   +-- endpoints.ts            # Centralized API endpoint constants
¦   +-- error-handler.ts        # Global API exception normalize utility
+-- app/                        # Main Application setup, root routing & global providers
¦   +-- App.tsx                 # Root App component
¦   +-- main.tsx                # React 18/19 entrypoint
¦   +-- router.tsx              # React Router v7 configuration
+-- assets/                     # Static assets (images, icons, brand SVG vectors)
¦   +-- icons/                  # Custom SVG icons
¦   +-- images/                 # Optimized brand banners & logos
+-- components/                 # Shared UI Components (Atomic Design Pattern)
¦   +-- ui/                     # Shadcn UI primitives (Button, Dialog, Dropdown, Input, etc.)
¦   +-- feedback/               # Toast, Skeletons, Error Boundaries, Empty States
¦   +-- forms/                  # Form Field wrappers (FormField, SelectField, DatePickerField)
¦   +-- layout/                 # Sidebar, Navbar, Footer, Breadcrumbs
¦   +-- tables/                 # Generic Data Table component (TanStack Table wrapper)
+-- config/                     # Application & Environment Configuration
¦   +-- env.config.ts           # Type-safe environment variables validation (Zod schema)
¦   +-- site.config.ts          # Site metadata, navigation items, feature flags
+-- constants/                  # Application-wide constants & enums
¦   +-- app.constants.ts        # App titles, timeouts, storage keys
¦   +-- roles.constants.ts      # Roles (ADMIN, PRACTITIONER, PATIENT) & Permissions
+-- contexts/                   # React Contexts for UI-only state (e.g., ThemeContext)
¦   +-- theme.context.tsx       # Light / Dark / System mode context
+-- features/                   # Feature-Driven Modules (Self-contained domain domains)
¦   +-- auth/                   # Authentication Feature
¦   ¦   +-- api/                # Auth API queries & mutations
¦   ¦   +-- components/         # LoginForm, OtpVerificationForm, ResetPasswordForm
¦   ¦   +-- hooks/              # useAuth, useOtpLogin, useSession
¦   ¦   +-- services/           # AuthService business logic
¦   ¦   +-- types/              # Auth DTOs & state interfaces
¦   ¦   +-- index.ts            # Public feature export index
¦   +-- practitioners/          # Practitioner Directory & Booking Feature
¦   +-- prescriptions/          # Electronic Prescriptions & Evidence Feature
¦   +-- patients/               # Patient Medical History & Consultations
¦   +-- analytics/              # Clinical Metrics & Research Analytics
+-- guards/                     # Route Protection & Middleware Guards
¦   +-- auth.guard.tsx          # Authenticated route guard
¦   +-- guest.guard.tsx         # Guest-only route guard (Login/Reg)
¦   +-- role.guard.tsx          # Role-based access control (RBAC) guard
¦   +-- permission.guard.tsx    # Fine-grained permission guard
+-- hooks/                      # Global Reusable Custom Hooks
¦   +-- use-debounce.ts         # Search input debouncing
¦   +-- use-disclosure.ts       # Modal / Drawer open-close toggle
¦   +-- use-media-query.ts      # Responsive breakpoint detection
¦   +-- use-toast.ts            # Sonner toast wrapper
+-- layouts/                    # Layout Wrappers
¦   +-- admin.layout.tsx        # Admin Dashboard Layout (Sidebar + Header + Content)
¦   +-- practitioner.layout.tsx # Clinical Portal Layout
¦   +-- patient.layout.tsx      # Patient Portal Layout
¦   +-- auth.layout.tsx         # Split-screen Auth Layout
+-- lib/                        # Third-party library initializations
¦   +-- query-client.ts         # TanStack Query Client instance with defaults
¦   +-- utils.ts                # Tailwind `cn()` helper (clsx + tailwind-merge)
+-- middlewares/                # Cross-cutting middleware utilities
¦   +-- logger.middleware.ts    # Frontend action & performance logging
+-- pages/                      # Page Components (Lazy Loaded Route Views)
¦   +-- admin/                  # Admin Management pages
¦   +-- auth/                   # Auth pages (Login, Register, VerifyOtp)
¦   +-- practitioner/           # Clinical workspace pages
¦   +-- public/                 # Landing, About, Contact, Terms pages
+-- providers/                  # Top-level Context & State Providers
¦   +-- app.provider.tsx        # Composite Provider (Query, Theme, Auth, Toast)
¦   +-- query.provider.tsx      # TanStack Query Client Provider
+-- repositories/               # Frontend Data Repository Layer (Clean Architecture)
¦   +-- base.repository.ts      # Abstract Base Repository class
¦   +-- auth.repository.ts      # Auth repository implementation
¦   +-- user.repository.ts      # User repository implementation
¦   +-- patient.repository.ts   # Patient repository implementation
+-- routes/                     # Centralized Route Paths & Definitions
¦   +-- paths.ts                # Type-safe route path constants
+-- services/                   # Frontend Business Logic & Service Mappers
¦   +-- auth.service.ts         # Token handling, session refresh, OTP logic
¦   +-- storage.service.ts      # Secure Session storage abstraction
+-- store/                      # Zustand Global Client State Management
¦   +-- use-auth.store.ts       # Global Auth & User state
¦   +-- use-sidebar.store.ts    # Dashboard sidebar open/collapsed state
¦   +-- use-theme.store.ts      # Theme preference store
+-- styles/                     # Global CSS & Tailwind Config Imports
¦   +-- globals.css             # Tailwind CSS v4 directives & custom utilities
+-- types/                      # Global TypeScript Type Definitions
¦   +-- api.types.ts            # Generic API Response & Pagination types
¦   +-- domain.types.ts         # Core Domain Entities (User, Patient, Practitioner)
¦   +-- nav.types.ts            # Sidebar & Navigation Menu types
+-- utils/                      # Helper & Utility Functions
    +-- formatters.ts           # Date, Currency, Phone number formatting
    +-- storage.ts              # LocalStorage & SessionStorage safe wrappers
    +-- validators.ts           # Common Zod validation rules
```

---

## Naming Conventions & Co-Location Rules

1. **Files & Folders**:
   - Folders: `kebab-case` (e.g., `features/healing-records`, `components/ui`)
   - React Components: `PascalCase.tsx` (e.g., `PatientCard.tsx`, `LoginForm.tsx`)
   - Hooks: `use-kebab-case.ts` (e.g., `use-practitioners.ts`)
   - Repositories & Services: `kebab-case.repository.ts`, `kebab-case.service.ts`
   - Store: `use-kebab-case.store.ts`

2. **Feature Module Boundaries**:
   - Anything specific to a single domain (e.g., `Auth`, `Practitioners`) MUST reside inside `features/<feature-name>/`.
   - Only truly shared UI controls (e.g., `Button`, `Dialog`) belong in `src/components/ui/`.
