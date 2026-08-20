# DUPLICATION_AUDIT.md

## Finding ID: D-001
- **Severity**: Low
- **Category**: Code Reuse
- **File**: `services/booking.service.ts` and `lib/booking.ts`
- **Problem**: Logic for fetching available slots is duplicated/similar in both locations.
- **Impact**: Maintenance burden; updates might miss one location.
- **Root Cause**: Poor modularization.
- **Recommendation**: Consolidate slot availability logic into a single shared utility in `lib/`.
- **Status**: Open
