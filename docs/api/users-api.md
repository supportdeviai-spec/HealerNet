# 👤 Users API Specification

## Base URL
`/api/v1/users`

---

## Endpoints Summary

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/profile` | Get logged-in user profile | Yes |
| `PUT` | `/profile` | Update profile information | Yes |
| `POST`| `/avatar` | Upload user profile picture | Yes |

---

## Sample Request & Response

### Update Profile
- **URL:** `PUT /api/v1/users/profile`
- **Request Body:**
```json
{
  "name": "Dr. Sarah Jenkins",
  "email": "sarah@healernet.org",
  "bio": "Integrative health physician specializing in evidence-based herbal medicine."
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Dr. Sarah Jenkins",
    "email": "sarah@healernet.org",
    "role": "practitioner",
    "updated_at": "2026-08-05T00:00:00Z"
  }
}
```
