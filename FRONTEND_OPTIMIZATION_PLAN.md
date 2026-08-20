# Frontend Optimization Plan

This document outlines the prioritized optimization roadmap for the BadmintonKu frontend, structured from P0 (Critical) to P3 (Low).

---

## P0 - Critical (Immediate Action Required for Core Stability & Performance)

### 1. Implement Route-Level Granular Error & Loading Boundaries
- **Problem**: Missing `error.tsx` and `loading.tsx` in sub-routes (`/booking`, `/courts`, `/admin/*`) leads to unhandled runtime crashes and poor UX during network glitches.
- **Evidence**: Absence of error boundary files in `app/booking/` and `app/admin/`.
- **Current Behavior**: Entire app fallback or white screen on unhandled layout/data errors.
- **Proposed Change**: Add `error.tsx` and `loading.tsx` (using skeleton loaders) to all major route segments.
- **Expected Benefit**: Zero unhandled white screens; graceful recovery and improved perceived loading speed.
- **Risk**: Low (isolated UI components).
- **Files Affected**: `app/booking/error.tsx`, `app/booking/loading.tsx`, `app/courts/error.tsx`, `app/courts/loading.tsx`, `app/admin/error.tsx`, `app/admin/loading.tsx`.

### 2. Fix Waterfall Data Fetching in Dashboard & Booking Flows
- **Problem**: Sequential await statements in Server Components causing high TTFB (Time to First Byte).
- **Evidence**: `app/dashboard/page.tsx` and admin pages awaiting session, user data, and bookings serially.
- **Current Behavior**: Request B starts only after Request A completes.
- **Proposed Change**: Wrap independent data fetches in `Promise.all()`.
- **Expected Benefit**: Reduction of server response time by 40-60%.
- **Risk**: Low.
- **Files Affected**: `app/dashboard/page.tsx`, `app/admin/dashboard/page.tsx`, `app/bookings/page.tsx`.

---

## P1 - High Priority (User Experience, Rendering & Core Web Vitals)

### 3. Dynamic Import of Heavy Admin Modules & Chart Libraries
- **Problem**: Admin reporting charts and calendar views included in main client bundles.
- **Evidence**: `app/admin/reports/page.tsx` and `app/admin/calendar/page.tsx` load heavy date/chart dependencies unconditionally.
- **Current Behavior**: Larger initial JS bundle size for all users.
- **Proposed Change**: Use `next/dynamic` with `ssr: false` for admin analytics charts and heavy calendar components.
- **Expected Benefit**: Reduced initial bundle size and faster Time to Interactive (TTI).
- **Risk**: Low.
- **Files Affected**: `app/admin/reports/page.tsx`, `app/admin/calendar/page.tsx`.

### 4. Optimize Availability Grid Re-renders (`React.memo` & `useCallback`)
- **Problem**: Selecting a time slot or date causes the entire grid and all sibling slots to re-render.
- **Evidence**: `components/ui/availability-grid.tsx` and `horizontal-date-selector.tsx` lack memoization for slot items.
- **Current Behavior**: Laggy UI response on mobile and lower-end devices when interacting with booking time slots.
- **Proposed Change**: Wrap slot item sub-components in `React.memo` and stabilize callback handlers with `useCallback`.
- **Expected Benefit**: Drastic improvement in Interaction to Next Paint (INP) and smooth grid tapping.
- **Risk**: Low.
- **Files Affected**: `components/ui/availability-grid.tsx`, `components/ui/horizontal-date-selector.tsx`.

### 5. Image Optimization & CLS Prevention
- **Problem**: Hero images and court photos missing explicit dimensions or priority tags.
- **Evidence**: Raw `<img>` tags or unoptimized `<Image />` without `sizes` prop.
- **Current Behavior**: Layout shift (CLS) when images load and slower LCP.
- **Proposed Change**: Enforce Next.js `<Image />` with `priority` on LCP elements and explicit width/height containers.
- **Expected Benefit**: Better LCP (< 2.5s) and zero layout shift.
- **Risk**: None.
- **Files Affected**: `app/page.tsx`, `app/courts/page.tsx`, `components/ui/nearest-available.tsx`.

---

## P2 - Medium Priority (Caching, Network & Accessibility)

### 6. Implement Client-Side Optimistic Updates for Bookings & Availability
- **Problem**: Users wait for full server roundtrip and page refresh when toggling or booking slots.
- **Evidence**: Server actions trigger standard revalidations without immediate UI feedback.
- **Current Behavior**: Sluggish feel during booking submissions.
- **Proposed Change**: Utilize React 19 `useOptimistic` or local state optimistic patches during booking creation.
- **Expected Benefit**: Instant UI feedback and perception of zero latency.
- **Risk**: Medium (requires robust rollback on error).
- **Files Affected**: `app/booking/page.tsx`, `components/ui/availability-grid.tsx`.

### 7. Accessibility (a11y) Hardening for Interactive Components
- **Problem**: Custom calendar cells, time slots, and dropdowns lack complete ARIA attributes and keyboard navigation.
- **Evidence**: Missing `role`, `aria-selected`, and `aria-label` attributes on custom grid buttons.
- **Current Behavior**: Screen readers fail to navigate booking grids effectively.
- **Proposed Change**: Add proper ARIA roles, `tabIndex`, and keyboard event listeners (Enter/Space/Arrow keys).
- **Expected Benefit**: WCAG AA compliance and broader user accessibility.
- **Risk**: Low.
- **Files Affected**: `components/ui/availability-grid.tsx`, `components/ui/horizontal-date-selector.tsx`, `components/ui/select.tsx`.

### 8. Add Cache-Control Headers & SWR Configuration
- **Problem**: Frequently requested court data and static schedules re-fetched from database on every navigation.
- **Evidence**: Absence of explicit caching directives on public read endpoints.
- **Current Behavior**: Unnecessary DB load and slower page transitions.
- **Proposed Change**: Configure Next.js fetch revalidation tags and Cache-Control headers in `next.config.ts`.
- **Expected Benefit**: Reduced server database queries and lightning-fast page loads.
- **Risk**: Low.
- **Files Affected**: `next.config.ts`, `services/availability.service.ts`, `services/booking.service.ts`.

---

## P3 - Low Priority (Polish, Build Hardening & Advanced Performance)

### 9. Next.js Config Hardening & Compression
- **Problem**: Default Next.js configuration without experimental React compiler or aggressive compression.
- **Evidence**: `next.config.ts` has basic settings.
- **Current Behavior**: Standard output bundle.
- **Proposed Change**: Enable gzip/brotli compression, optimize package imports for Lucide icons (`optimizePackageImports`), and enable React compiler if compatible.
- **Expected Benefit**: Smaller asset transfer sizes and optimized runtime compilation.
- **Risk**: Low.
- **Files Affected**: `next.config.ts`.

### 10. Bundle Analyzer Integration
- **Problem**: Lack of visual tooling to track bundle regressions over time.
- **Evidence**: No `@next/bundle-analyzer` setup in repo.
- **Current Behavior**: Blindness to bundle size bloat.
- **Proposed Change**: Add `@next/bundle-analyzer` as an optional build script.
- **Expected Benefit**: Proactive bundle size governance.
- **Risk**: None.
- **Files Affected**: `next.config.ts`, `package.json`.
