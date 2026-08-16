# 🧱 Clean Architecture Specification

## Clean Architecture Layers

```
+-------------------------------------------------------------+
| 1. Presentation Layer (Controllers, Resources, Requests)    |
|   +-----------------------------------------------------+   |
|   | 2. Application Layer (Services, DTOs, Event Handlers)|   |
|   |   +---------------------------------------------+   |   |
|   |   | 3. Domain Layer (Entities, Value Objects)   |   |   |
|   |   +---------------------------------------------+   |   |
|   | 4. Infrastructure Layer (Repositories, External API)|   |
|   +-----------------------------------------------------+   |
+-------------------------------------------------------------+
```

### 1. Presentation Layer (`app/Http`)
- **Controllers:** Delegates request handling to Service layer. Returns JSON or Inertia responses.
- **Form Requests:** Validates incoming payloads.
- **API Resources:** Formats models into API output.

### 2. Application Layer (`app/Services`)
- Implements application business logic.
- Orchestrates entity interaction, event dispatching, and external service execution.

### 3. Domain Layer (`app/Models`, `app/Domain`)
- Core business entities, contracts, interfaces, domain exceptions.

### 4. Infrastructure Layer (`app/Repositories`, `app/Infrastructure`)
- Database access abstractions via Repositories.
- External integrations (WhatsApp API, Mailers, Storage drivers).
