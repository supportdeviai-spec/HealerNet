# HealerNet Enterprise Frontend Coding Standards & Guidelines

## 1. React 19 & Component Design Guidelines

### 1.1 Pure Components & Side-Effect Isolation
- Components MUST be pure render functions of their `props` and `state`.
- Side-effects (HTTP calls, DOM manipulations, timeouts) MUST be encapsulated inside `useEffect` or TanStack Query hooks.
- Never perform state updates during the render pass.

### 1.2 Custom Hooks Isolation
- Extract complex UI state, data fetching, or event handling into custom hooks named `use[FeatureName]`.
- Example:
```tsx
// Preferred: Business logic isolated in custom hook
export function PatientList() {
  const { patients, isLoading, error, deletePatient } = usePatients();

  if (isLoading) return <TableSkeleton />;
  if (error) return <ErrorMessage message={error.message} />;

  return <PatientTable data={patients} onDelete={deletePatient} />;
}
```

### 1.3 Strict TypeScript Usage
- **No `any`**: Explicitly specify types or use `unknown` if the type is dynamic.
- Prefer `interface` for object definitions and `type` for unions/tuples.
- Define API response DTOs using Zod schemas to infer static types automatically.

```typescript
import { z } from 'zod';

export const UserSchema = z.object({
  id: z.number(),
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['ADMIN', 'PRACTITIONER', 'PATIENT']),
  created_at: z.string(),
});

export type UserDTO = z.infer<typeof UserSchema>;
```

---

## 2. State Management Rules

1. **Server State (TanStack Query)**:
   - ALL backend API fetching, caching, pagination, and data mutations MUST use TanStack Query hooks (`useQuery`, `useMutation`).
   - Define query keys centrally in a typed `queryKeys` factory per feature module.

```typescript
export const practitionerQueryKeys = {
  all: ['practitioners'] as const,
  lists: () => [...practitionerQueryKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...practitionerQueryKeys.lists(), filters] as const,
  details: () => [...practitionerQueryKeys.all, 'detail'] as const,
  detail: (id: string | number) => [...practitionerQueryKeys.details(), id] as const,
};
```

2. **Global Client State (Zustand)**:
   - Limit Zustand usage to cross-cutting UI state: authenticated user session, current active theme, sidebar state, and transient notifications.

---

## 3. Accessibility (WCAG 2.1 AA) & Styling Rules

- Use semantic HTML tags (`<header>`, `<main>`, `<nav>`, `<article>`, `<aside>`).
- Interactive elements MUST have keyboard focus indicators and `aria-label` attributes where text labels are absent.
- Contrast ratios MUST meet minimum 4.5:1 for normal text and 3:1 for large text.
- Use Tailwind CSS v4 design tokens defined in `@theme` blocks instead of arbitrary inline hex codes.

---

## 4. Testing & Code Quality Pipeline

### 4.1 Automated Tooling Setup
- **ESLint**: `@typescript-eslint/recommended`, `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y`.
- **Prettier**: Single quotes, 2 spaces, trailing commas `all`, print width 100.
- **Husky & Lint-Staged**: Runs `eslint --fix`, `prettier --write`, and `vitest related` before allowing git commits.
- **Commitlint**: Enforces Conventional Commits standard (e.g., `feat(auth): add mobile OTP verification step`).

### 4.2 Commit Syntax Matrix
- `feat(scope)`: New feature added
- `fix(scope)`: Bug fix
- `docs(scope)`: Documentation changes
- `refactor(scope)`: Code refactoring without behavioral changes
- `test(scope)`: Adding or updating tests
