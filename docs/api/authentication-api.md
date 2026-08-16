# 🔐 Authentication API Specification

## Base URL
`/api/v1/auth`

---

## Endpoints Summary

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/send-otp` | Request phone OTP code | No |
| `POST` | `/verify-otp` | Verify OTP code & return Bearer token | No |
| `POST` | `/logout` | Revoke active token session | Yes (Sanctum) |
| `GET`  | `/me` | Get current authenticated user details | Yes (Sanctum) |

---

## Endpoints Specification

### 1. Send OTP
Request a 6-digit OTP code sent via SMS/WhatsApp.

- **URL:** `POST /api/v1/auth/send-otp`
- **Headers:** `Content-Type: application/json`
- **Request Body:**
```json
{
  "phone": "+1234567890"
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "OTP sent successfully.",
  "expires_in_seconds": 300
}
```

---

### 2. Verify OTP
Submit OTP code for validation and token creation.

- **URL:** `POST /api/v1/auth/verify-otp`
- **Headers:** `Content-Type: application/json`
- **Request Body:**
```json
{
  "phone": "+1234567890",
  "otp": "123456"
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "token_type": "Bearer",
  "access_token": "1|sanctum_token_hash_here...",
  "user": {
    "id": 1,
    "name": "Jane Doe",
    "phone": "+1234567890",
    "role": "practitioner"
  }
}
```

---

### 3. Logout
Revoke current user token.

- **URL:** `POST /api/v1/auth/logout`
- **Headers:** `Authorization: Bearer <token>`
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Successfully logged out."
}
```
