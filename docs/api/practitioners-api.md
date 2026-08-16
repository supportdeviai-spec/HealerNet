# 🩺 Practitioners API Specification

## Base URL
`/api/v1/practitioners`

---

## Endpoints Summary

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | List verified practitioners with filters | Optional |
| `GET` | `/{id}` | Get practitioner detailed profile | Optional |
| `POST`| `/apply` | Apply for practitioner verification | Yes |

---

## Sample Filter Parameters
- `specialization`: e.g. `naturopathy`, `ayurveda`, `integrative-oncology`
- `min_rating`: e.g. `4.5`
- `location`: e.g. `California, US`

```json
{
  "data": [
    {
      "id": 12,
      "name": "Dr. Sarah Jenkins",
      "specialization": "Integrative Herbalism",
      "rating": 4.9,
      "verified": true
    }
  ]
}
```
