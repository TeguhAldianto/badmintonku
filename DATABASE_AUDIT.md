# DATABASE_AUDIT.md

## Finding ID: DB-001
- **Severity**: Low
- **Category**: Schema
- **File**: `prisma/schema.prisma`
- **Problem**: Missing indexes on `bookingDate` and `startTime` in the `Booking` model.
- **Impact**: Slower query performance as the application scales.
- **Root Cause**: Default schema doesn't account for read-heavy scheduling queries.
- **Recommendation**: Add composite index on `(bookingDate, startTime, courtId)`.
- **Status**: Open
