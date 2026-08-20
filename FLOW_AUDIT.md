# FLOW_AUDIT.md

## Finding ID: F-001
- **Severity**: Medium
- **Category**: Logic/Flow
- **File**: `app/page.tsx` (Booking flow)
- **Problem**: No check for booking expiration on `Pending Payment` status.
- **Impact**: User can hold a slot indefinitely by not uploading proof, preventing others from booking.
- **Root Cause**: Missing cron job or cleanup task for expired `Pending Payment` bookings.
- **Recommendation**: Implement a cleanup task to auto-cancel `Pending Payment` bookings after 30-60 minutes.
- **Status**: Open

## Finding ID: F-002
- **Severity**: Low
- **Category**: UX/Flow
- **File**: `components/ui/calendar.tsx` / `app/page.tsx`
- **Problem**: No visual feedback when multiple users try to select the same slot simultaneously.
- **Impact**: Potential race condition during submission.
- **Root Cause**: Optimistic UI rendering without strict server-side lock validation.
- **Recommendation**: Add server-side locking or state check immediately before writing to the database.
- **Status**: Open
