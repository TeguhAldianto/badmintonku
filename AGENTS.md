<!-- BEGIN:nextjs-agent-rules -->
# Ini BUKAN Next.js yang Anda kenal

Versi ini memiliki perubahan besar (breaking changes) — API, konvensi, dan struktur file dapat berbeda dari data pelatihan Anda. Baca panduan terkait di `node_modules/next/dist/docs/` sebelum menulis kode apa pun. Perhatikan catatan depresiasi.

Blok ini ditulis dan ditambahkan ulang oleh `next dev` — verifikasi di `node_modules/next/dist/server/lib/generate-agent-files.js`. Menghapusnya dari diff hanya akan membuat ulang perubahan yang belum dicommit; melakukan commit bersama pekerjaan Anda akan menjaga kebersihan tree.
<!-- END:nextjs-agent-rules -->

# Panduan Repository — BadmintonKu

Next.js **16.3.0** (App Router, React 19, Turbopack), Prisma **6** + MySQL, NextAuth v5 beta, Tailwind v4, Midtrans, Fonnte (WhatsApp). UI Bahasa Indonesia.

## Perintah (yang benar)
```bash
npm run dev            # next dev
npm run build          # next build
npm run start
npm run lint           # = `eslint` murni; lolos tanpa error/peringatan
npx tsc --noEmit       # lolos
npx vitest run         # 61 pengujian di 6 file, memerlukan MySQL aktif; konfigurasi di vitest.config.mjs
npx prisma generate
npx prisma migrate dev
npx prisma db seed     # prisma/seed.ts via tsx
npx prisma validate
```
Tidak ada **skrip `test`** di `package.json` — gunakan `npx vitest run`, bukan `npm test`.

## Lingkungan (Environment)
Konfigurasi ada di `.env` (diabaikan git). Hanya `DATABASE_URL` + `AUTH_SECRET` yang awalnya diset.
Digunakan oleh kode: `DATABASE_URL`, `AUTH_SECRET`, `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY`, `MIDTRANS_IS_PRODUCTION`, `FONNTE_API_KEY`, `CRON_SECRET`, `APP_TIME_ZONE`, `NODE_ENV`.
Kunci WhatsApp yang hilang akan menurunkan performa secara anggun (graceful degradation). Kunci Midtrans yang hilang membuat pembayaran tidak berfungsi. `/api/cron/expire-bookings` mengembalikan 503 saat `CRON_SECRET` tidak diatur (tidak pernah tanpa autentikasi).

Data Seed: `admin@badmintonku.com` / `admin123`. Halaman login sudah tidak menampilkan data ini.

## Peta Arsitektur (Feature-sliced)
- `app/` — Halaman App Router + adaptor rute API tipis (`app/api/**/route.ts`). `error.tsx` harus berupa Client Component.
- `features/booking/` — `types.ts`, `schemas.ts` (Zod), `lib/slots.ts` (jam/slot/tumpang tindih/`groupContiguousSlots`), `lib/pricing.ts`, `server/booking.service.ts`, `server/availability.service.ts`, `components/` (grid ketersediaan, pemilih tanggal, CTA).
- `features/payment/` — `constants.ts` (aman untuk klien), `server/payment.service.ts` (unggah bukti, aksi admin, token Midtrans), `server/midtrans.gateway.ts` (tanda tangan + Snap), `server/midtrans.webhook.ts` (penangan notifikasi).
- `features/notification/` — `server/templates.ts`, `server/notification.service.ts` (Fonnte + `notificationLog`).
- `features/admin/` — `server/queries.ts` (dasbor/laporan/pengaturan/daftar), `components/`.
- `shared/` — `lib/date.ts` (tanggal UTC-saja + pembantu WIB), `lib/format.ts`, `api/errors.ts`, `api/response.ts` (`ok`/`fail`/`handleRouteError`/`readJson`), `components/status-badge.tsx`.
- `server/db/prisma.ts` — Singleton Prisma. Jangan pernah menginstansiasi `PrismaClient` di tempat lain.
- `server/auth/guards.ts` — `getAdminSession()` / `requireAdmin()`; gunakan ini di rute, bukan `auth()` mentah.
- `auth.ts` + `middleware.ts` — Konfigurasi NextAuth v5 dan perlindungan rute.
- `prisma/schema.prisma` — sumber kebenaran untuk model data (mencakup `Config`, `Blacklist`, kolom Midtrans).
- `tests/` — Vitest, mengakses database **asli** dari `DATABASE_URL`; tanpa mock kecuali gateway Midtrans di `tests/midtrans.test.ts`. `public/uploads/payments` diabaikan oleh git; pengujian membersihkan dirinya sendiri setelah selesai.
- `scripts/load-test.ts` — skrip beban manual, bukan bagian dari CI.

Aturan Impor: komponen klien tidak boleh mengimpor `features/*/server/*` (karena menarik modul Node/Prisma). Gunakan `features/payment/constants.ts` sebagai gantinya.

## Invarian Pemesanan & Pembayaran
- Semua penulisan pemesanan melalui `features/booking/server/booking.service.ts` di dalam transaksi Prisma interaktif pada isolasi `Serializable` dengan `SELECT ... FOR UPDATE` pada lapangan/hari. Pertahankan keduanya — kunci mentah adalah yang benar-benar menserialisasikan penulis.
- Harga dihitung di sisi server dari kunci `Config` `PRICE_PER_HOUR` (default `50_000` di `features/booking/lib/pricing.ts`). `Court` tidak memiliki kolom harga; jangan pernah percaya harga yang disuplai klien.
- Konflik slot menggunakan satu mesin ketersediaan (`features/booking/server/availability.service.ts`): `PENDING_PAYMENT` memblokir hingga `expiresAt`, sedangkan `WAITING_VERIFICATION` dan `CONFIRMED` selalu memblokir. Jangan tambahkan implementasi kedua.
- Slot adalah integer yang selaras dengan jam (`startTime`, `endTime` sebagai jam, misal 10 → 11).
- `date` adalah kolom `DATE` MySQL tetapi diteruskan sebagai `Date` JS. Perlakukan tanggal sebagai **midnight UTC** atau tanggal akan bergeser sehari (gunakan `shared/lib/date.ts`).
- Alur status: `PENDING_PAYMENT` → `WAITING_VERIFICATION` → `CONFIRMED` / `REJECTED`; `PENDING_PAYMENT` → `EXPIRED` / `CANCELLED`. Transisi melalui `assertBookingStatusTransition`.
- Pengeditan status admin (`app/api/admin/bookings/[id]/route.ts`) menggunakan `updateBookingStatusByAdmin`, yang menggunakan kembali tabel transisi yang sama dan menyinkronkan `Payment`.
- `POST /api/payments/midtrans/notification` menolak tanda tangan tidak valid (401) dan ketidakcocokan jumlah; jangan pernah mengonfirmasi pemesanan dari payload yang tidak terverifikasi.
- Akses tamu dibatasi nomor telepon untuk mutasi: `POST /api/payments/[id]/proof` dan `POST /api/payments/midtrans/create` memerlukan `userPhone`; `GET /api/bookings/[code]` mengembalikan nomor telepon yang disamarkan dan tanpa riwayat status untuk tamu.

## Catatan Pengujian
- `npx vitest run` hijau (61/61). Tes murni (`availability`, `date-pricing`, `midtrans-signature`) tidak memerlukan MySQL; `booking`, `payment`, `midtrans` memerlukannya.
- `tests/booking.test.ts` menggunakan **tanggal UTC-midnight masa depan yang dinamis** dan menegaskan tepat satu pemenuhan untuk upaya pemesanan ganda yang bersamaan. Jangan memperkenalkan kembali tanggal hardcoded.
- Pengujian berasumsi lapangan dengan ID `1..3` dan akan memodifikasi database yang dikonfigurasi. Jangan jalankan pada data produksi.
- `tests/midtrans.test.ts` melakukan mock pada `@/features/payment/server/midtrans.gateway` (`verifySignature` → true, `createSnapToken` → stub). Matematika tanda tangan asli dicakup dalam `tests/midtrans-signature.test.ts`.

## Peringatan Tersisa
1. **Migrasi sudah lama/stale.** `prisma/migrations/` hanya memiliki 3 migrasi SQL dan kehilangan `Config`, `Blacklist`, dan kolom Midtrans meskipun `migrate status` mengatakan "up to date" (objek tersebut di-push, bukan dimigrasi). Buat migrasi nyata sebelum perilisan.
2. **`middleware.ts` sudah usang di Next 16** — ganti nama menjadi `proxy.ts` saat menyentuh perutean autentikasi. Build memberikan peringatan mengenainya. Pembatas laju (rate limiter) bersifat memori per-proses dan disetel ulang saat deployment.
3. `next.config.ts` kosong; `package-lock.json` di direktori induk menghasilkan peringatan root Turbopack. Atur `turbopack.root` jika berisik.
4. `npm audit --omit=dev` melaporkan 8 kerentanan (1 kritis) di `next`, `axios`, `sharp`, `prisma` — peningkatan Next.js adalah yang utama.
5. Audit markdown akar saling bertentangan (`*_AUDIT.md`, `*_REPORT.md`). Percaya pada kode dan perintah, bukan dokumen tersebut. `ARCHITECTURE.md` menjelaskan direktori `repositories/` dan `schemas/` yang tidak ada.
6. `app/page.tsx` (beranda) berisi emoji mojibake lama (`??` alih-alih 🏸). Hanya kosmetik.
7. Kunci Midtrans/Fonnte tidak ada secara lokal, sehingga jalur pembayaran + WhatsApp tidak dapat diuji ujung ke ujung (end-to-end); keduanya gagal secara anggun/dengan kode 500 secara desain.

## Konvensi
- Alias path `@/*` → root repo.
- UI: komponen bergaya shadcn di `components/ui`, pembantu `cn()` di `lib/utils.ts`, Tailwind v4 melalui `postcss.config.mjs` (tanpa direktif `@tailwind` — gunakan `@import "tailwindcss"`).
- `next/dynamic` dengan `ssr: false` harus berada di dalam pembungkus Client Component (mis. `client-reports.tsx`).
- Jaga perubahan tetap minimal dan sesuaikan dengan salinan dan penamaan bahasa Indonesia yang ada.
