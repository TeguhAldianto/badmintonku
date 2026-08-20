# CAPACITY_REPORT.md

## Analysis
- **Current State**: 3 Courts, 14 hours/day (08:00 - 21:00).
- **Daily Capacity**: 42 slots/day.
- **Constraints**: Database handles low volume, but lack of index will cause degradation as historical data piles up.
- **Recommendations**:
  - Implement archiving strategy for completed bookings (move to `ArchiveBooking` table).
  - Use server-side caching (Redis or similar) for availability grid to prevent repetitive DB load.
