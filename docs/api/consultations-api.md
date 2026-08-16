# 📅 Consultations & Evidence API Specifications

## 1. Consultations API (`/api/v1/consultations`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | List active consultations for user/practitioner |
| `POST` | `/book` | Book a new consultation session |
| `POST` | `/{id}/complete` | Mark consultation as complete with notes |

---

## 2. Evidence Studies API (`/api/v1/evidence-studies`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Search evidence-based clinical research & studies |
| `POST` | `/` | Submit research study entry (Practitioners/Researchers) |
| `GET` | `/{id}` | Detailed study metadata & DOI links |
