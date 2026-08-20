# Security & Race Condition Fixes Report

## Summary
Fixed CRITICAL and HIGH severity issues identified in the security audit.

---

## 1. CRITICAL: Race Condition (Double Booking) - FIXED

**Location:** `services/booking.service.ts:32-80`

**Problem:** The availability check (`validateBookingSlot`) was performed OUTSIDE the transaction, creating a race window between check and booking creation.

**Fix:** Moved the availability/blocked-slot check INSIDE the serializable transaction.

```typescript
// Before: Check outside transaction (RACE CONDITION)
const validation = await validateBookingSlot(courtId, date, startTime, endTime);
const booking = await prisma.$transaction(async (tx) => { ... });

// After: Check inside transaction (ATOMIC)
const booking = await prisma.$transaction(async (tx) => {
  const blocked = await tx.blockedSlot.findFirst({ ... });
  if (blocked) throw new Error("Slot tidak tersedia (diblokir admin)");
  
  const existing = await tx.booking.findFirst({ ... });
  if (existing) throw new Error("Slot telah dibooking oleh orang lain");
  
  return tx.booking.create({ ... });
}, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
```

**Verification:** Unit test `tests/booking.test.ts` passes - concurrent bookings for same slot result in only 1 success.

---

## 2. CRITICAL: IDOR on Admin Endpoints - VERIFIED SECURE

**Audit:** All `app/api/admin/**/*` routes checked.

**Finding:** All admin endpoints already have proper admin role verification:

```typescript
const session = await auth();
if (!session?.user || session.user.role !== "ADMIN") {
  return NextResponse.json({ message: "Forbidden" }, { status: 403 });
}
```

**Files verified:**
- `app/api/admin/stats/route.ts` ��
- `app/api/admin/settings/route.ts` ��
- `app/api/admin/payments/route.ts` ��
- `app/api/admin/bookings/route.ts` ��
- `app/api/admin/bookings/[id]/route.ts` ��
- `app/api/admin/payments/[id]/action/route.ts` ��
- `app/api/admin/blocked-slots/route.ts` ��

**No changes needed** - already secure.

---

## 3. HIGH: Rate Limiting - ENHANCED

**Location:** `middleware.ts:8-40`

**Problem:** Rate limiting only applied to `/api/bookings` and `/api/availability`, missing `/api/admin` and `/api/payments`.

**Fix:** Extended rate limiting to all sensitive routes:

```typescript
const isSensitiveRoute = pathname.startsWith("/api/bookings") || 
                         pathname.startsWith("/api/availability") ||
                         pathname.startsWith("/api/admin") ||
                         pathname.startsWith("/api/payments");
```

**Note:** In-memory limiter (Map) works for single instance. For production multi-instance, consider Redis-based rate limiting.

---

## 4. HIGH: Payment Manipulation - FIXED

**Location:** `services/midtrans.notification.ts:54-60`

**Problem:** Midtrans webhook `gross_amount` was accepted without verification against booking `totalPrice`, allowing payment amount manipulation.

**Fix:** Added server-side amount verification before processing notification:

```typescript
// CRITICAL: Verify gross_amount matches booking totalPrice
const expectedAmount = Number(payment.booking.totalPrice);
const receivedAmount = parseFloat(gross_amount);
if (receivedAmount !== expectedAmount) {
  console.error(`Payment amount mismatch: expected ${expectedAmount}, received ${receivedAmount}`);
  return { success: false, message: "Payment amount mismatch" };
}
```

**Verification:** Test #10 in `tests/midtrans.test.ts` now correctly expects rejection on amount mismatch.

---

## Test Results

```
Test Files  4 passed (4)
Tests  35 passed (35)
```

## Lint Results

```
��� 2 problems (0 errors, 2 warnings)
```
(Warnings are pre-existing unused imports in unrelated files)

## Type Check

```
(no errors)
```

---

## Files Modified

| File | Changes |
|------|---------|
| `services/booking.service.ts` | Moved availability check inside serializable transaction |
| `middleware.ts` | Extended rate limiting to admin/payment routes |
| `services/midtrans.notification.ts` | Added payment amount verification |
| `tests/midtrans.test.ts` | Updated test #10 to expect rejection on amount mismatch |

---

## Post-Fix Validation Checklist

- [x] Race condition: Concurrent booking test passes (only 1 success)
- [x] IDOR: All admin endpoints have role check
- [x] Rate limiting: Applied to `/api/admin` and `/api/payments`
- [x] Payment manipulation: Amount mismatch rejected
- [x] All unit/integration tests pass (35/35)
- [x] TypeScript compilation passes
- [x] ESLint passes (0 errors)