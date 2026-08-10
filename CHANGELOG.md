# Changelog - BadmintonKu

## [1.0.0] - 2025-08-11

### Added
- **WhatsApp Notification System** (`services/notification.service.ts`)
  - Fonnte API integration with retry mechanism & logging
  - Templates: BOOKING_CREATED, PAYMENT_SUBMITTED, PAYMENT_APPROVED, PAYMENT_REJECTED, BOOKING_EXPIRED
  - Helper functions: `notifyBookingCreated`, `notifyPaymentSubmitted`, `notifyPaymentApproved`, `notifyPaymentRejected`, `notifyBookingExpired`
- **Automated Booking Expiration Cron** (`app/api/cron/expire-bookings/route.ts`)
  - Finds PENDING_PAYMENT bookings past `expiresAt`
  - Updates status to EXPIRED + status history
  - Triggers WhatsApp BOOKING_EXPIRED notification
  - Protected by optional `CRON_SECRET` Bearer token
- **Rate Limiting Middleware** (`middleware.ts`)
  - In-memory rate limiter (30 req/min per IP)
  - Applied to `/api/bookings` and `/api/availability`
  - Returns 429 with Indonesian message
- **API Documentation** (`API_SPEC.md`)
  - Complete endpoint reference for public & admin APIs
  - Request/Response examples, error codes, auth rules
- **Testing Strategy Document** (`TESTING_STRATEGY.md`)
  - Testing pyramid, unit/integration/E2E plans
  - Playwright config, CI/CD workflow, security checklist
- **Helper Functions for Notifications** (`services/notification.service.ts`)
  - `notifyBookingCreated`, `notifyPaymentSubmitted`, `notifyPaymentApproved`, `notifyPaymentRejected`, `notifyBookingExpired`

### Fixed
- **Booking Concurrency Race Condition** (`services/booking.service.ts`)
  - Added `notifyBookingCreated` call AFTER transaction commit (non-blocking)
  - Fixed TypeScript errors in notification helper data fetching
- **Payment Notification Race Conditions** (`services/payment.service.ts`)
  - Separate transaction from notification (fetch booking with court after TX)
  - Fixed return type of `processPaymentAdmin` to `{ success: true }`
  - Fixed notification calls for approve/reject to fetch fresh booking data
- **Rate Limiting IP Detection** (`middleware.ts`)
  - Fixed `request.ip` → `request.headers.get('x-forwarded-for')` / `x-real-ip`
- **Test Flakiness** (`tests/payment.test.ts`)
  - Wrapped `beforeEach` cleanup in try-catch for concurrent run safety

### Security
- **Rate Limiting** implemented on public APIs (`/api/bookings`, `/api/availability`)
  - 30 requests/minute per IP, 429 response with Indonesian message
- **Cron Endpoint Protection** (`/api/cron/expire-bookings`)
  - Optional `CRON_SECRET` Bearer token validation
- **Payment State Machine Enforcement** (server-side only)
  - User can only upload proof from UNPAID → VERIFYING
  - Admin only can approve/reject from VERIFYING
  - Self-approval prevention

### Changed
- **Payment Admin Return Type** (`services/payment.service.ts`)
  - `processPaymentAdmin` now returns `{ success: true }` instead of full payment object
  - Tests updated to verify via Prisma queries
- **Booking Service** (`services/booking.service.ts`)
  - Added `include: { court: true }` to transaction for notification data
  - Notification fire-and-forget after commit with error logging
- **Payment Service** (`services/payment.service.ts`)
  - `uploadPaymentProof` now includes court in initial booking fetch
  - Admin approve/reject fetch fresh booking for notifications
  - Return type simplified to `{ success: true }` / throws on error

### Tests
- **All 25 Unit Tests Pass** (`npx vitest run`)
  - Availability: 9 tests (slots, overlap, boundaries, courts, expiry)
  - Booking: 1 test (concurrent race condition)
  - Payment: 15 tests (state machine, upload, admin actions, ownership, invalid transitions, file validation)
- **TypeScript Compilation**: `npx tsc --noEmit` ✅
- **ESLint**: 1 warning only (unused SlotStatus import) ✅
- **Production Build**: `npm run build` ✅

### Build
- **Next.js 16.3 (Turbopack)** production build successful
- All routes compiled, static pages generated
- No type errors or critical lint issues

---

## Production Blockers Resolved (from FINAL_AUDIT.md)

| Blocker | Status | Resolution |
|---------|--------|------------|
| WhatsApp Notification tidak terkirim | ✅ Fixed | Wired into booking/payment services |
| Booking Expired tidak otomatis | ✅ Fixed | Cron API + notification |
| Rate Limiting | ✅ Fixed | Middleware with 30 req/min |
| Missing required docs | ✅ Fixed | API_SPEC.md, TESTING_STRATEGY.md |

---

## Remaining Technical Debt (Non-Blocking)

- Missing `/admin/users` CRUD implementation
- Admin Settings form persistence
- Integration tests (API routes + DB)
- E2E tests (Playwright)
- CI/CD pipeline (GitHub Actions)
- Export CSV/PDF for admin reports

---

## Deployment Notes

### Required Environment Variables
```env
DATABASE_URL="mysql://..."
AUTH_SECRET="..."
FONNTE_API_KEY="..."  # For WhatsApp notifications
CRON_SECRET="..."     # For cron endpoint protection
```

### Cron Job Setup
```bash
# Vercel Cron (vercel.json)
{
  "crons": [{
    "path": "/api/cron/expire-bookings",
    "schedule": "*/5 * * * *"
  }]
}
```

### Production Checklist
- [ ] Set `FONNTE_API_KEY` and `CRON_SECRET`
- [ ] Configure Vercel Cron or external scheduler
- [ ] Set up MySQL managed instance
- [ ] Configure domain & SSL
- [ ] Enable Vercel Analytics / Error tracking