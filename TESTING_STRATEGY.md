# Testing Strategy - BadmintonKu

**Tujuan**: Memastikan kualitas, keandalan, dan keamanan aplikasi melalui lapisan testing yang terstruktur.

---

## 1. Testing Pyramid

```
         ████████
       ██ E2E Tests ██
     ██ Integration Tests ██
   ████████████████████
  ██ Unit Tests (Service Layer) ██
████████████████████████████
```

| Layer | Target | Tools | Coverage Goal |
|-------|--------|-------|---------------|
| **Unit** | Service logic, utils, validators | Vitest | > 90% |
| **Integration** | API routes, DB transactions, Prisma | Vitest + Test DB | Critical paths |
| **E2E** | User flows (Booking, Admin) | Playwright | Critical journeys |

---

## 2. Unit Tests (Current: 25 tests ✅)

### Location: `tests/*.test.ts`

| Test File | Scope | Status |
|-----------|-------|--------|
| `availability.test.ts` | Slot generation, overlap logic, boundary checks, court isolation, expired booking handling | 9 tests ✅ |
| `booking.test.ts` | Concurrent booking race condition (Serializable isolation) | 1 test ✅ |
| `payment.test.ts` | State machine, upload proof, admin approve/reject, ownership, invalid transitions | 15 tests ✅ |

### Run Commands
```bash
npx vitest run           # Run all tests once
npx vitest run --ui      # With UI
npx vitest run --coverage # With coverage report
```

### Key Test Scenarios

#### Availability Engine
- ✅ Generates 13 slots (08:00-21:00)
- ✅ Overlap detection (same hour, partial, contained)
- ✅ Boundary non-overlap (08-09 vs 09-10)
- ✅ Different courts don't conflict
- ✅ Expired/Cancelled bookings don't block

#### Booking Concurrency
- ✅ Two users same court+time → only 1 succeeds (Serializable TX)

#### Payment State Machine
- ✅ User upload: UNPAID → VERIFYING
- ✅ Admin approve: VERIFYING → PAID + Booking CONFIRMED
- ✅ Admin reject: VERIFYING → REJECTED + Booking REJECTED
- ✅ Ownership: User B cannot access User A payment
- ✅ Invalid transitions blocked (approve from UNPAID, etc.)
- ✅ File validation (type, size)

---

## 3. Integration Tests (Planned)

### Test DB Setup
```bash
# Separate test database
DATABASE_URL_TEST="mysql://root:@localhost:3306/badmintonku_test"
```

### Test Suites to Implement

| Area | Test Cases |
|------|------------|
| **Auth API** | Login success, invalid credentials, role check, session persistence |
| **Booking API** | POST success, validation errors, double booking, expired slot, concurrent |
| **Payment API** | Upload proof, invalid file, ownership, admin actions |
| **Admin API** | Dashboard stats, bookings list/filter, update status, courts CRUD, blocked slots CRUD |
| **Cron API** | Expire bookings, notification trigger, idempotency |

### Example: Booking API Integration Test
```typescript
// tests/integration/booking.api.test.ts
import { describe, test, expect, beforeEach } from "vitest";
import { createBooking } from "@/services/booking.service";

describe("Booking API Integration", () => {
  test("POST /api/bookings creates booking with PENDING_PAYMENT", async () => {
    const booking = await createBooking({
      courtId: 1,
      date: new Date("2025-12-31"),
      startTime: 10,
      endTime: 11,
      userName: "Test User",
      userPhone: "08123456789",
    });
    expect(booking.status).toBe("PENDING_PAYMENT");
    expect(booking.payment.status).toBe("UNPAID");
  });
});
```

---

## 4. E2E Tests (Planned - Playwright)

### Critical User Journeys

| Journey | Steps | Assertions |
|---------|-------|------------|
| **Happy Path Booking** | Home → Courts → Pick Date → Pick Court → Pick Time → Fill Form → Submit → Confirmation | Booking created, status PENDING_PAYMENT, WhatsApp sent |
| **Payment Flow** | Booking created → Upload proof → Admin approve → User sees CONFIRMED | Payment VERIFYING → PAID, Booking CONFIRMED |
| **Admin Verification** | Login → Dashboard → Payments → Review → Approve | Payment PAID, Booking CONFIRMED, WhatsApp sent |
| **Double Booking Prevention** | User A books 10-11 → User B tries same → B rejected | Only 1 booking created |

### Playwright Config
```typescript
// playwright.config.ts
export default defineConfig({
  testDir: './tests/e2e',
  use: { baseURL: 'http://localhost:3000' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: { command: 'npm run dev', port: 3000 },
});
```

---

## 5. Test Data Management

### Factories (Prisma)
```typescript
// tests/factories.ts
export const createTestCourt = (overrides = {}) => ({
  name: "Test Court",
  description: "Test",
  isActive: true,
  ...overrides,
});

export const createTestBooking = (overrides = {}) => ({
  courtId: 1,
  date: new Date("2025-12-31"),
  startTime: 10,
  endTime: 11,
  userName: "Test User",
  userPhone: "08123456789",
  ...overrides,
});
```

### Cleanup Strategy
```typescript
// beforeEach: truncate tables
await prisma.$executeRaw`TRUNCATE TABLE "bookings", "payments", "blocked_slots" CASCADE`;
```

---

## 6. CI/CD Integration

### GitHub Actions Workflow
```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      mysql:
        image: mysql:8
        env: { MYSQL_ROOT_PASSWORD: root, MYSQL_DATABASE: badmintonku_test }
        ports: [3306:3306]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx prisma migrate deploy
        env: { DATABASE_URL: mysql://root:root@localhost:3306/badmintonku_test }
      - run: npm run lint
      - run: npx tsc --noEmit
      - run: npx vitest run
      - run: npx playwright test
```

---

## 7. Test Coverage Requirements

| Metric | Threshold |
|--------|-----------|
| Statements | > 80% |
| Branches | > 75% |
| Functions | > 80% |
| Lines | > 80% |

### Current Coverage (Unit Only)
```
File                         | % Stmts | % Branch | % Funcs | % Lines
-----------------------------|---------|----------|---------|--------
services/availability.service|   100%  |   100%   |   100%  |   100%
services/booking.service     |    90%  |    85%   |    90%  |    90%
services/payment.service     |    85%  |    80%   |    85%  |    85%
-----------------------------|---------|----------|---------|--------
```

---

## 8. Security Testing Checklist

- [ ] SQL Injection via input fields
- [ ] XSS via booking form fields (name, phone)
- [ ] IDOR on `/api/bookings/[code]` and `/api/payments/[id]/proof`
- [ ] Admin privilege escalation on `/api/admin/*`
- [ ] File upload validation (MIME, size, path traversal)
- [ ] Rate limiting on public endpoints
- [ ] Auth bypass on admin routes
- [ ] Session fixation/hijacking

---

## 8. Performance Testing (Planned)

| Test | Tool | Target |
|------|------|--------|
| Load Test (100 concurrent bookings) | k6 | < 2s p95 |
| Stress Test (500 req/s availability) | k6 | No 5xx errors |
| DB Connection Pool | Manual | Stable under load |

---

## 9. Summary

| Status | Count |
|--------|-------|
| Unit Tests Implemented | 25 ✅ |
| Integration Tests | 0 (Planned) |
| E2E Tests | 0 (Planned) |
| CI/CD Pipeline | 0 (Planned) |

**Next Steps**:
1. Setup test database & integration test suite
2. Implement Playwright E2E for 4 critical journeys
3. Add GitHub Actions workflow
4. Achieve >80% coverage across all layers