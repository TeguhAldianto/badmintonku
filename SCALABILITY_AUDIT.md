# SCALABILITY AUDIT

| Finding ID | Severity | Area | Problem | Evidence | Root Cause | Impact | Recommendation | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| S-001 | High | Architecture | Monolithic Service | `booking.service.ts` combines DB, logic, and external API | Lack of separation of concerns | Difficult to scale individual components | Refactor into Controller-Service-Repository pattern | Open |
| S-002 | Medium | Infrastructure | Static File Storage | Local filesystem usage for uploads | No cloud storage integration (e.g., S3) | Disk space exhaustion / non-distributed storage | Switch to S3-compatible object storage | Open |

→ skipped: distributed tracing (Jaeger/OTEL), add when multi-server deployment begins.