<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.
<!-- END:nextjs-agent-rules -->

# Repository Guide

## Essential Commands
- **Dev Server**: `npm run dev`
- **Build**: `npm run build`
- **Start**: `npm run start`
- **Lint**: `npm run lint` (uses flat config in `eslint.config.mjs`)
- **Test**: `npx vitest` (tests in `tests/` directory)
- **Test Watch**: `npx vitest watch`
- **Prisma Generate**: `npx prisma generate`
- **Prisma Migrate**: `npx prisma migrate dev`
- **Prisma Seed**: `npx prisma db seed` (uses `tsx prisma/seed.ts`)
- **Prisma Studio**: `npx prisma studio`

## Critical Architecture Notes
- **App Router**: All routes in `app/` directory (not `pages/`)
- **Authentication**: Uses NextAuth.js (check `lib/` for utils)
- **Payment Processing**: Integrated with Midtrans (see Payment model for fields)
- **Prisma Client**: Singleton instance in `lib/prisma.ts` to prevent hot-reload issues
- **Environment**: Requires `.env.local` with `DATABASE_URL` (MySQL connection)

## Testing Specifics
- **Test Location**: `tests/**/*.test.ts`
- **Test Setup**: Uses Vitest with Node.js environment and globals
- **Test Helper**: `prisma` client available via `@/lib/prisma`
- **Test Pattern**: Look for `describe` blocks testing concurrent scenarios (race conditions)

## Prisma Workflow
- **Seed Data**: Default admin: `admin@badmintonku.com` / `admin123` (see `prisma/seed.ts`)
- **Models**: Admin, Court, Booking, Payment, BlockedSlot, BookingStatusHistory, NotificationLog, Blacklist, Config
- **Enums**: `BookingStatus` (PENDING_PAYMENT, CONFIRMED, etc.), `PaymentStatus` (UNPAID, PAID, etc.)
- **Indexes**: Check schema for performance-critical indexes on `[courtId, date]` and `[userPhone]`

## Code Style & Conventions
- **Tailwind**: Uses CSS variables for radii (`--radius`) defined in globals.css
- **Imports**: Use `@/` alias for absolute paths (configured in tsconfig.json)
- **Components**: Shadcn/UI variants in `components/ui/` (Button, Card, etc.)
- **Services**: Business logic in `services/` directory (booking.service.ts, payment.service.ts, etc.)
- **Lib**: Utilities in `lib/` (prisma.ts for singleton client, utils.ts, booking.ts)

## Gotchas
- **Linting**: `npm run lint` requires no args - config is in `eslint.config.mjs`
- **TypeScript**: Includes `vitest/globals` in types for test helpers
- **Midtrans**: Payment model includes Midtrans-specific fields (transactionId, fraudStatus, etc.)
- **Booking System**: Designed to prevent double booking via database constraints and service logic