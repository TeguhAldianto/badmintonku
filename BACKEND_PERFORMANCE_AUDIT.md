# BACKEND PERFORMANCE AUDIT

| Finding ID | Severity | Endpoint/File | Problem | Evidence | Root Cause | Impact | Recommendation | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| P-001 | Medium | `services/booking.service.ts` | Lack of query optimization (possible N+1) | Frequent fetch of user/field details in loops | Prisma relations accessed without explicit `select` or `include` optimization | Increased database load | Implement selective field fetching using Prisma `select` | Open |
| P-002 | Low | Global | Missing Response Caching | No headers implemented for idempotent GET endpoints | Default Next.js dynamic rendering | Redundant DB queries | Implement `Cache-Control` headers for static/read-only data | Open |

→ skipped: implementation details (code edits), add when load testing shows latency > 200ms.