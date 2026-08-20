# PERFORMANCE_AUDIT.md

## Finding ID: P-001
- **Severity**: Low
- **Category**: Performance
- **File**: `app/page.tsx`
- **Problem**: Fetching entire bookings list on page load for the calendar grid.
- **Impact**: Unnecessary data transfer and slow UI response if DB grows.
- **Root Cause**: Missing pagination or time-range filtering in initial fetch.
- **Recommendation**: Filter by date range at the database query level (e.g., only fetch the current month).
- **Status**: Open
