# HealerNet Frontend Enterprise Architecture Specification

**Version:** 1.0.0  
**Target Stack:** React 19, Vite 6, TypeScript 5.7, Tailwind CSS v4, TanStack Query v5, Zustand, Axios  
**Backend Alignment:** Laravel 13 REST API + Sanctum Auth + Redis + MySQL  

---

## 1. Executive Summary & Technology Stack Matrix

HealerNet is a global, evidence-based holistic health platform serving patients, healthcare practitioners, researchers, and system administrators. The frontend is built as a highly decoupled, type-safe, resilient Single Page Application (SPA) communicating exclusively via RESTful APIs with the Laravel 13 backend.

### 1.1 Technology Stack Selection & Rationales

| Layer / Concern | Recommended Tool | Chosen Over | Architectural Justification |
| :--- | :--- | :--- | :--- |
| **Core Framework** | **React 19** | Vue 3, Angular 19 | Industry standard, concurrent rendering, Server Components readiness, rich TypeScript ecosystem. |
| **Build Tooling** | **Vite 6** | Webpack, Turbopack | Instant HMR, ESM native bundling, fast build times via Esbuild. |
| **Client State** | **Zustand** | Redux Toolkit, Context | Zero boilerplate, un-opinionated, ultra-lightweight (<2KB), avoids re-render issues inherent to Context API. |
| **Server State** | **TanStack Query v5** | RTK Query, SWR | Automatic caching, stale-while-revalidate, optimistic updates, query invalidation, and retry strategies. |
| **UI Primitive Library** | **Shadcn UI** | MUI, Mantine, Ant Design | Unstyled Radix UI primitives, zero bundle overhead, 100% code ownership, native Tailwind CSS integration. |
| **Routing** | **React Router v7** | TanStack Router | Standard SPA router, nested layouts, type-safe loaders, lazy route boundaries. |
| **Form System** | **React Hook Form + Zod** | Formik, Yup | Uncontrolled input performance, zero re-renders on keystroke, runtime type inference via Zod schemas. |
| **API Client** | **Axios** | Native `fetch` | Interceptor pipeline, request cancellation tokens, automatic JSON transforms, standardized error handling. |
| **Notifications** | **Sonner** | React Hot Toast, Toastify | Headless, accessible toast engine with stacked animations and dark mode support. |
| **Charts** | **Recharts + ECharts** | ApexCharts, Chart.js | Declarative SVG/Canvas rendering, responsive wrappers, lightweight for dashboard metrics. |
| **Data Tables** | **TanStack Table v8** | AG-Grid, Material React Table | Headless data grid offering full UI control, virtualization support, server-side pagination/sorting/filtering. |

---

## 2. Architecture & Design Principles

The frontend architecture adheres strictly to **Clean Architecture** and **SOLID Principles**:

```
+-----------------------------------------------------------------------------------+
| PRESENTATION LAYER                                                                |
| Components (Atomic Design: Atoms, Molecules, Organisms), Pages, Layouts, Modals   |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| APPLICATION & FEATURE LAYER                                                       |
| Custom Hooks, UI State (Zustand), TanStack Query Hooks, Providers                 |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| DOMAIN & SERVICE LAYER                                                            |
| Use Cases, Business Logic, DTO Mappers, Domain Entities / Models                  |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| INFRASTRUCTURE & DATA LAYER                                                       |
| Repositories (Abstract & Concrete), Axios HTTP Engine, Sanctum Auth Interceptors |
+-----------------------------------------------------------------------------------+
```

### 2.1 Clean Architecture Mapping

1. **Presentation Layer (`src/components`, `src/pages`, `src/layouts`)**: Pure UI rendering. Components do not contain direct API logic; they consume custom hooks and feature services.
2. **Feature Layer (`src/features`)**: Encapsulates specific domain features (e.g., `features/auth`, `features/practitioners`, `features/prescriptions`). Each feature folder contains its own components, hooks, api, and types.
3. **Service & Repository Layer (`src/services`, `src/repositories`)**: Abstraction layer between backend endpoints and state management. Repositories handle API queries and map backend JSON responses into typed Domain DTOs.
4. **Infrastructure Layer (`src/lib/axios`, `src/api`)**: Axios configuration, global interceptors, CSRF cookie management, refresh token mechanisms.

---

## 3. UI Framework & Admin Dashboard Comparison

### 3.1 Component Library Evaluation Matrix

| Criterion | **Shadcn UI** (Winner) | **Mantine** | **Material UI (MUI)** | **Ant Design** |
| :--- | :--- | :--- | :--- | :--- |
| **Bundle Size Impact** | **Near 0 KB** (Copied components) | ~150 KB | ~320 KB (Emotion dependent) | ~450 KB |
| **Customizability** | **100% Direct Code Access** | High (Theme Tokens) | Hard (CSS-in-JS overrides) | Rigid (Ant Theme config) |
| **Design Aesthetics** | **Modern, Sleek, Dark Mode Native** | Modern | Corporate Google Material | Corporate Enterprise |
| **Accessibility (WCAG)** | **Built-in via Radix UI Primitives**| Excellent | Excellent | Moderate |
| **Tailwind v4 Integration**| **Native** | Requires plugin | Requires wrapper | Requires CSS overrides |

> **Recommendation:** **Shadcn UI** is selected for HealerNet. It provides Radix UI accessible primitives with Tailwind styling, giving full code ownership without library lock-in.

---

## 4. Authentication Architecture & Sanctum Integration

HealerNet utilizes **Laravel Sanctum SPA Authentication** with Cookie-based HTTP-only session tokens or Bearer tokens.

```
[ Client Browser ]             [ Axios Interceptor ]            [ Laravel 13 Sanctum ]
        |                              |                                  |
        |--- 1. Login Request -------->|                                  |
        |                              |--- 2. GET /sanctum/csrf-cookie -->|
        |                              |<-- 3. XSRF-TOKEN Cookie ---------|
        |                              |                                  |
        |                              |--- 4. POST /api/v1/auth/login -->|
        |                              |<-- 5. User DTO + Bearer Token ---|
        |                              |                                  |
        |<-- 6. Store User (Zustand) --|                                  |
```

### 4.1 Route Guard & Role/Permission Middleware

The application enforces declarative Route Guards:

```tsx
// ProtectedRoute enforcing Auth, Role, and Permission Checks
<Route element={<ProtectedRoute requiredRoles={['ADMIN', 'PRACTITIONER']} requiredPermissions={['read:records']} />}>
  <Route path="/dashboard/healing-records" element={<HealingRecordsPage />} />
</Route>
```

---

## 5. API Client & Repository Pattern Implementation

### 5.1 Abstract Base Repository Pattern

```typescript
// src/repositories/base.repository.ts
import { AxiosInstance } from 'axios';

export interface BaseRepositoryInterface<T> {
  findAll(params?: Record<string, unknown>): Promise<T[]>;
  findById(id: string | number): Promise<T>;
  create(data: Partial<T>): Promise<T>;
  update(id: string | number, data: Partial<T>): Promise<T>;
  delete(id: string | number): Promise<boolean>;
}

export abstract class BaseRepository<T> implements BaseRepositoryInterface<T> {
  constructor(
    protected readonly http: AxiosInstance,
    protected readonly endpoint: string
  ) {}

  async findAll(params?: Record<string, unknown>): Promise<T[]> {
    const response = await this.http.get<{ data: T[] }>(this.endpoint, { params });
    return response.data.data;
  }

  async findById(id: string | number): Promise<T> {
    const response = await this.http.get<{ data: T }>(`${this.endpoint}/${id}`);
    return response.data.data;
  }

  async create(data: Partial<T>): Promise<T> {
    const response = await this.http.post<{ data: T }>(this.endpoint, data);
    return response.data.data;
  }

  async update(id: string | number, data: Partial<T>): Promise<T> {
    const response = await this.http.put<{ data: T }>(`${this.endpoint}/${id}`, data);
    return response.data.data;
  }

  async delete(id: string | number): Promise<boolean> {
    await this.http.delete(`${this.endpoint}/${id}`);
    return true;
  }
}
```

---

## 6. Performance, Security & Quality Standards

1. **Route Code Splitting**: All pages lazy loaded via `React.lazy()` and wrapped in `Suspense` with Skeleton loaders.
2. **Security**:
   - Storage of sensitive state strictly in memory via Zustand (no sensitive tokens in `localStorage`).
   - CSRF protection via Sanctum headers.
   - XSS sanitization of user-generated HTML content using DOMPurify.
3. **Data Grid Virtualization**: Large tables rendered using `@tanstack/react-virtual` to ensure 60fps scrolling on 10,000+ rows.
4. **Testing Suite**:
   - **Vitest**: Unit testing for Repositories, Services, and Utilities.
   - **React Testing Library**: Integration testing for UI Components and Forms.
   - **Playwright**: End-to-End (E2E) testing for core user journeys (OTP Login, Prescription Management).
