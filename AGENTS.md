<!-- BEGIN:nextjs-agent-rules -->
# Ini BUKAN Next.js yang Anda kenal

Versi ini memiliki perubahan besar (breaking changes) — API, konvensi, dan struktur file dapat berbeda dari data pelatihan Anda. Baca panduan terkait di `node_modules/next/dist/docs/` sebelum menulis kode apa pun. Perhatikan catatan depresiasi.

Blok ini ditulis dan ditambahkan ulang oleh `next dev` — verifikasi di `node_modules/next/dist/server/lib/generate-agent-files.js`. Menghapusnya dari diff hanya akan membuat ulang perubahan yang belum dicommit; melakukan commit bersama pekerjaan Anda mecegah kotornya git tree.
<!-- END:nextjs-agent-rules -->

# Panduan Repository — BadmintonKu

Next.js **16.4.6** (App Router, React 19, Turbopack), Prisma **6** + MySQL, NextAuth v5 beta, Tailwind v4, Midtrans, Fonnte (WhatsApp). UI Bahasa Indonesia.

## Perintah Verifikasi & Pengembangan
```bash
npm run dev            # next dev
npm run build          # next build
npm run start          # next start
npm run lint           # eslint murni; lolos tanpa error/peringatan
npx tsc --noEmit       # Typecheck TypeScript; lolos tanpa error
npx vitest run         # 61 pengujian di 6 file (memerlukan MySQL aktif; konfigurasi di vitest.config.mjs)
npx prisma generate    # Generate Prisma Client
npx prisma migrate dev # Migrasi database Prisma
npx prisma db seed     # Seed database via tsx (prisma/seed.ts)
npx prisma validate    # Validasi skema Prisma
```
*Catatan:* Tidak ada skrip `test` di `package.json` — gunakan `npx vitest run`.

## Lingkungan (Environment)
Konfigurasi ada di `.env`. Variabel yang digunakan:
`DATABASE_URL`, `AUTH_SECRET`, `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY`, `MIDTRANS_IS_PRODUCTION`, `FONNTE_API_KEY`, `CRON_SECRET`, `APP_TIME_ZONE`, `NODE_ENV`.
- Tanpa `FONNTE_API_KEY`: Graceful degradation (log dicatat, app tidak crash).
- Tanpa kunci Midtrans: Pembayaran gateway gagal dengan kode 500.
- Cron `/api/cron/expire-bookings`: Memerlukan header `Authorization: Bearer <CRON_SECRET>`.

Data Seed Default: `admin@badmintonku.com` / `admin123`.

## Peta Arsitektur (Feature-Sliced Design)
- `app/` — App Router pages & API adapter routes (`app/api/**/route.ts`).
- `proxy.ts` — Proxy/Middleware Next.js 16 di root repo. Mengatur proteksi rute NextAuth (`/admin`, `/login`) & rate-limiter in-memory per IP untuk rute sensitif (`/api/*`).
- `features/booking/` — `types.ts`, `schemas.ts` (Zod), `lib/slots.ts`, `lib/pricing.ts`, `server/booking.service.ts`, `server/availability.service.ts`, komponen UI.
- `features/payment/` — `constants.ts` (aman untuk client), `server/payment.service.ts`, `server/midtrans.gateway.ts`, `server/midtrans.webhook.ts`.
- `features/notification/` — `server/templates.ts`, `server/notification.service.ts` (Fonnte & `notificationLog`).
- `features/admin/` — `server/queries.ts` (dasbor, laporan, pengaturan), komponen admin.
- `shared/` — `lib/date.ts` (utilitas UTC & WIB), `lib/format.ts`, `api/errors.ts`, `api/response.ts` (`ok`/`fail`/`handleRouteError`), `components/`.
- `server/db/prisma.ts` — Singleton `PrismaClient`. Jangan buat instansiasi baru di tempat lain.
- `server/auth/guards.ts` — `getAdminSession()` / `requireAdmin()`. Gunakan ini di API route admin.
- `prisma/schema.prisma` — Sumber kebenaran skema data.

*Aturan Impor:* Client Component (`"use client"`) **dilarang** mengimpor dari `features/*/server/*` (mencegah modul Node/Prisma masuk bundle browser). Import konstanta dari `features/payment/constants.ts`.

## Invarian Pemesanan & Pembayaran
1. **Pencegahan Double Booking:** Semua pembuatan booking wajib via `features/booking/server/booking.service.ts` dalam transaksi interaktif Prisma dengan isolasi `Serializable` + lock `SELECT ... FOR UPDATE` pada lapangan/hari.
2. **Perhitungan Harga:** Diolah di server via tabel `Config` key `PRICE_PER_HOUR` (default `50000`). Model `Court` tidak memiliki kolom harga. Jangan percaya harga dari payload client.
3. **Mesin Ketersediaan (Availability Engine):** Konflik slot dihitung di `availability.service.ts`. Status `PENDING_PAYMENT` memblokir slot hingga `expiresAt`. Status `WAITING_VERIFICATION` dan `CONFIRMED` memblokir slot secara permanen.
4. **Format Tanggal:** Kolom `date` adalah `DATE` MySQL. Selalu konversi dan perlakukan sebagai **UTC midnight** (`shared/lib/date.ts`) untuk mencegah pengerusan H-1/H+1 akibat timezone.
5. **Transisi Status:** `PENDING_PAYMENT` → `WAITING_VERIFICATION` → `CONFIRMED` / `REJECTED`; atau `PENDING_PAYMENT` → `EXPIRED` / `CANCELLED`. Selalu gunakan `assertBookingStatusTransition`.
6. **Verifikasi Webhook Midtrans:** `POST /api/payments/midtrans/notification` wajib menolak signature invalid (401) dan mismatch amount.

## Pengujian & Testing
- 61/61 test Vitest lulus.
- Unit test murni (`availability.test.ts`, `date-pricing.test.ts`, `midtrans-signature.test.ts`) tidak butuh DB.
- Integration test (`booking.test.ts`, `payment.test.ts`, `midtrans.test.ts`) membutuhkan koneksi MySQL aktif dari `DATABASE_URL`.
- Pengujian mengasumsikan ID court `1..3` ada di database.

## Catatan Penting Repo
- `proxy.ts` menggantikan `middleware.ts` sesuai standar Next.js 16.
- Alias path `@/*` mengarah ke root repository.
- Tailwind v4 digunakan via `@import "tailwindcss"` di `globals.css` (tanpa direktif `@tailwind`).
