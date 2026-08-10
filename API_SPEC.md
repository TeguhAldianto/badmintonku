# API Specification - BadmintonKu

**Base URL**: `https://domain.com/api`  
**Content-Type**: `application/json`  
**Auth**: NextAuth (Session Cookie) / Bearer Token for Cron

---

## 1. Public User Endpoints

### Courts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/courts` | Daftar semua lapangan aktif |

**Response 200**:
```json
{
  "success": true,
  "data": [
    { "id": 1, "name": "Court 1", "description": "Standard Indoor Court 1", "isActive": true }
  ]
}
```

---

### Availability
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/availability?courtId=1&date=2025-08-15` | Cek ketersediaan slot per jam |

**Query Params**:
- `courtId` (number, required)
- `date` (string, required, format: YYYY-MM-DD)

**Response 200**:
```json
{
  "success": true,
  "data": [
    { "startTime": 8, "endTime": 9, "status": "AVAILABLE" },
    { "startTime": 9, "endTime": 10, "status": "BOOKED" },
    { "startTime": 10, "endTime": 11, "status": "BLOCKED" }
  ]
}
```

**Status Values**: `AVAILABLE`, `BOOKED`, `PENDING`, `BLOCKED`

---

### Bookings
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/bookings` | Buat booking baru |

**Request Body**:
```json
{
  "courtId": 1,
  "date": "2025-08-15",
  "startTime": 10,
  "endTime": 12,
  "userName": "John Doe",
  "userPhone": "08123456789"
}
```

**Response 200**:
```json
{
  "success": true,
  "data": {
    "id": "clx123...",
    "courtId": 1,
    "date": "2025-08-15T00:00:00.000Z",
    "startTime": 10,
    "endTime": 12,
    "userName": "John Doe",
    "userPhone": "08123456789",
    "totalPrice": 100000,
    "expiresAt": "2025-08-15T11:30:00.000Z",
    "status": "PENDING_PAYMENT",
    "court": { "id": 1, "name": "Court 1" },
    "payment": { "id": "...", "amount": 100000, "status": "UNPAID" }
  }
}
```

**Response 409** (Slot conflict):
```json
{ "success": false, "message": "Slot telah dibooking oleh orang lain" }
```

---

### Payment Proof Upload
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payments/[bookingId]/proof` | Upload bukti pembayaran |

**Request**: `multipart/form-data`
- `file` (File, max 2MB, jpg/png/webp)
- `method` (string): `BANK_TRANSFER` | `QRIS` | `DIRECT`
- `userPhone` (string): Nomor HP pemesan

**Response 200**:
```json
{
  "success": true,
  "data": {
    "id": "...",
    "bookingId": "...",
    "amount": 100000,
    "status": "VERIFYING",
    "proofUrl": "/uploads/...",
    "method": "BANK_TRANSFER"
  }
}
```

---

### Booking Detail
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/bookings/[code]` | Detail booking by ID |

**Response 200**:
```json
{
  "success": true,
  "data": {
    "id": "...",
    "status": "WAITING_VERIFICATION",
    "court": { "name": "Court 1" },
    "date": "2025-08-15T00:00:00.000Z",
    "startTime": 10,
    "endTime": 12,
    "userName": "John",
    "userPhone": "08123456789",
    "totalPrice": 100000,
    "payment": { "status": "VERIFYING", "proofUrl": "/uploads/..." }
  }
}
```

---

## 2. Admin Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/[...nextauth]` | Auth.js handler |

---

### Dashboard Stats
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/stats` | Statistik dashboard admin |

**Response 200**:
```json
{
  "bookingsToday": 5,
  "pending": 2,
  "revenue": 500000
}
```

---

### Bookings Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/bookings?search=john&status=PENDING_PAYMENT` | List booking dengan filter |
| PATCH | `/api/admin/bookings/[id]` | Update status booking |

**PATCH Body**:
```json
{ "status": "CONFIRMED" } // atau CANCELLED, COMPLETED, REJECTED
```

---

### Payments Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/payments` | List semua pembayaran |
| POST | `/api/admin/payments/[id]/action` | Approve/Reject pembayaran |

**POST Body**:
```json
{
  "action": "APPROVE", // atau "REJECT"
  "rejectionReason": "Nominal tidak sesuai" // wajib jika REJECT
}
```

---

### Courts Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| PATCH | `/api/courts/[id]` | Update nama/deskripsi/status aktif |

**Body**:
```json
{ "name": "Court 1 VIP", "description": "Dengan AC", "isActive": true }
```

---

### Blocked Slots (Schedule Management)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/blocked-slots?courtId=1&date=2025-08-15` | List slot diblokir |
| POST | `/api/admin/blocked-slots` | Blokir slot waktu |
| DELETE | `/api/admin/blocked-slots?id=1` | Buka blokir |

**POST Body**:
```json
{
  "courtId": 1,
  "date": "2025-08-15",
  "startTime": 12,
  "endTime": 13,
  "reason": "Maintenance AC"
}
```

---

### Cron Jobs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cron/expire-bookings` | Expire pending bookings |

**Headers** (Production):
```
Authorization: Bearer <CRON_SECRET>
```

**Response 200**:
```json
{
  "success": true,
  "message": "Processed 3 expired bookings, 3 notifications sent",
  "data": { "expiredCount": 3, "notifiedCount": 3 }
}
```

---

## 3. Error Format

All endpoints return consistent error format:

```json
{
  "success": false,
  "message": "Deskripsi error yang user-friendly"
}
```

**HTTP Status Codes**:
- `200` - Success
- `400` - Bad Request (validasi input)
- `401` - Unauthorized
- `403` - Forbidden (Role mismatch)
- `404` - Not Found
- `409` - Conflict (Double booking)
- `429` - Too Many Requests (Rate limit)
- `500` - Internal Server Error

---

## 4. Authentication & Authorization

### User (Public)
- No login required for booking
- Identified by `userPhone` (guest checkout)

### Admin
- Session-based via NextAuth (Credentials Provider)
- Role check: `session.user.role === "ADMIN"`
- Protected routes: `/admin/*`, `/api/admin/*`

### Cron Jobs
- Bearer token: `Authorization: Bearer <CRON_SECRET>`
- Set `CRON_SECRET` in env

---

## 5. Rate Limiting

- Public APIs (`/api/bookings`, `/api/availability`): **30 req/minute per IP**
- Response: `429 Too Many Requests`

---

## 6. Webhooks / Notifications

- WhatsApp via Fonnte API (async, non-blocking)
- Events: BOOKING_CREATED, PAYMENT_SUBMITTED, PAYMENT_APPROVED, PAYMENT_REJECTED, BOOKING_EXPIRED
- Template strings in `services/notification.service.ts`

---

## 7. Data Models (Summary)

### Booking
```typescript
{
  id: string (cuid)
  courtId: number
  date: Date
  startTime: number (8-20)
  endTime: number (9-21)
  userName: string
  userPhone: string
  status: Enum [PENDING_PAYMENT, WAITING_VERIFICATION, CONFIRMED, CANCELLED, REJECTED, EXPIRED, COMPLETED]
  totalPrice: Decimal
  expiresAt: Date
  createdAt: DateTime
}
```

### Payment
```typescript
{
  id: string (cuid)
  bookingId: string (unique)
  amount: Decimal
  proofUrl: string?
  status: Enum [UNPAID, VERIFYING, PAID, REJECTED]
  rejectionReason: string?
  verifiedAt: DateTime?
  method: string? (DIRECT, BANK_TRANSFER, QRIS)
}
```

### BlockedSlot
```typescript
{
  id: Int (autoincrement)
  courtId: Int
  date: Date
  startTime: Int
  endTime: Int
  reason: String?
}
```