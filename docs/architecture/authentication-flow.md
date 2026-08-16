# 🔐 Authentication Flow Specification

## OTP & Sanctum Authentication Sequence

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Client as React / Web Client
    participant AuthAPI as Laravel Auth Controller
    participant OTPService as OTP Service Layer
    participant Notification as SMS/WhatsApp Gateway
    participant DB as Database / Redis

    User->>Client: Enter Phone Number
    Client->>AuthAPI: POST /api/v1/auth/send-otp
    AuthAPI->>OTPService: Generate OTP Code
    OTPService->>DB: Store hashed OTP (5 min TTL)
    OTPService->>Notification: Dispatch OTP Code
    Notification-->>User: Receive SMS / WhatsApp OTP
    User->>Client: Input OTP Code
    Client->>AuthAPI: POST /api/v1/auth/verify-otp
    AuthAPI->>OTPService: Validate OTP Code
    OTPService->>DB: Check & invalidate OTP
    AuthAPI->>DB: Issue Sanctum Bearer Token
    AuthAPI-->>Client: Return Token & User Role Payload
```

## Security & Policies
- **Token Expiry:** Configurable Sanctum expiration.
- **Rate Limiting:** Maximum 3 OTP requests per phone number per 15 minutes.
- **Role Control:** Middleware check (`role:admin`, `role:practitioner`, `role:user`).
