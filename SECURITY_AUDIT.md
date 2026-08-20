# SECURITY_AUDIT.md

## Finding ID: S-001
- **Severity**: High
- **Category**: IDOR
- **File**: `app/api/bookings/[id]/verify/route.ts` (hypothetical path)
- **Problem**: Lack of check if the current authenticated user has permission to manage bookings.
- **Impact**: Any user with a valid session (or even unauthenticated, if middleware is lax) might be able to verify/reject payments.
- **Root Cause**: Missing role-based access control (RBAC) in API endpoints.
- **Recommendation**: Implement strict session validation and role verification in all admin API routes.
- **Status**: Open

## Finding ID: S-002
- **Severity**: Medium
- **Category**: File Validation
- **File**: `lib/booking.ts` (upload logic)
- **Problem**: Insufficient file validation for payment proof uploads (only client-side mentioned, need server-side).
- **Impact**: Potential upload of malicious files (e.g., PHP scripts if server configured incorrectly).
- **Root Cause**: Reliance on client-side validation only.
- **Recommendation**: Implement server-side file type and size validation using a library like `file-type` and enforce strict storage pathing (outside public web directory).
- **Status**: Open
