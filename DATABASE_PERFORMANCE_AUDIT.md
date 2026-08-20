# DATABASE PERFORMANCE AUDIT

| Finding ID | Severity | File/Context | Problem | Evidence | Root Cause | Impact | Recommendation | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| DB-001 | High | `prisma/schema.prisma` | Missing Indices on FKs | `booking` table lacks index on `userId`, `courtId` | Default Prisma migration doesn't auto-index all foreign keys | Slow `JOIN` and search operations | Add `@index` to critical Foreign Keys | Open |
| DB-002 | Medium | Postgres Config | Connection Pool limit | Default pool size might be exhausted under high concurrency | Unmanaged connection lifecycle | `500 Internal Server Error` on high traffic | Configure explicit `connection_limit` in `DATABASE_URL` | Open |

→ skipped: raw SQL optimizations, add when EXPLAIN ANALYZE reports sequential scans.