# LOAD_TEST_PLAN.md

## Objective
Verify system stability under concurrent booking scenarios.

## Scenarios
1. **Normal Load**: 5 users booking simultaneously.
2. **Peak Collision**: 20 users attempting to book the same slot at the exact same time.
3. **Admin Stress**: Admin verifying/rejecting bookings while users are active.

## Tools
- `k6` or `Artillery` to simulate concurrent HTTP requests against the booking endpoint.
