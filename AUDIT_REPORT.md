# AUDIT_REPORT.md - Comprehensive Technical Audit
**Project:** OMAH GUYUB (BadmintonKu)  
**Date:** 2026-11-15  
**Auditor:** Senior Software Architect & Audit Team  
**Release Readiness Score:** 65 / 100

---

## 1. Executive Summary

Audit teknis komprehensif ini dilakukan secara *read-only* pada codebase OMAH GUYUB. Aplikasi menggunakan **Next.js 16.3.0 (App Router, React 19)**, **Prisma 6 + MySQL**, **NextAuth v5 beta**, **Tailwind v4**, **Midtrans Snap/Webhook**, dan **Fonnte (WhatsApp API)**.

Secara fungsional, fitur inti (engine ketersediaan slot, pencegahan double-booking dengan transaksi `Serializable` + `FOR UPDATE`, kalkulasi harga server-side, serta verifikasi webhook Midtrans) telah terimplementasi dengan baik dan lolos seluruh unit/integration test (61/61 passed). Namun, terdapat beberapa temuan kritis pada dependensi, integritas migrasi database, dan struktur file/dokumentasi yang perlu ditangani sebelum deployment ke lingkungan produksi.

---

## 2. Tabel Temuan Utama (Summary Table)

| ID | Severity | File Path / Area | Deskripsi Masalah | Dampak Bisnis / Teknis |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | **CRITICAL** | `package.json` | Next.js `16.3.0` memiliki kerentanan RCE kritis (CVE-2026-96889, GHSA-p293-qw3h-jr36) pada host Windows & Image Optimization. | Potensi server di-hijack / RCE dari luar tanpa autentikasi. |
| **DB-01** | **HIGH** | `prisma/migrations/` | File migrasi fisik tidak sinkron dengan `schema.prisma` (hilang model `Config`, `Blacklist`, & kolom Midtrans). | Deployment ke DB baru akan gagal atau kehilangan struktur tabel. |
| **SEC-02** | **HIGH** | `package.json` | Dependensi `axios` (`1.7.9`) memiliki beberapa kerentanan SSRF & Prototype Pollution (GHSA-vh66-26gq-q6x8). | Potensi request forgery / DoS pada komunikasi server eksternal. |
| **DEP-01** | **HIGH** | `package.json` | Terdapat adapter Prisma yang tidak digunakan (`@prisma/adapter-pg`, `@prisma/adapter-libsql`, `@prisma/adapter-planetscale`). | Bloat dependensi `node_modules` dan potensi konflik build. |
| **ARC-01** | **MEDIUM** | `middleware.ts` vs `proxy.ts` | Adanya duplikasi file middleware routing (`middleware.ts` di root vs Next.js 16 `proxy.ts` convention). | Peringatan build Turbopack/Next 16 dan perilaku middleware berpotensi ambigu. |
| **UI-01** | **LOW** | `app/page.tsx` | Mojibake unicode (`??` menggantikan icon shuttlecock/badminton). | Tampilan visual awal kurang profesional. |
| **DOC-01** | **LOW** | Root Directory | Terdapat 24+ file Markdown audit lama yang saling bertentangan dan mengacu pada arsitektur/direktori non-eksisten (`repositories/`, `schemas/`). | Kebingungan pengembang dalam memahami arsitektur aktual. |

---

## 3. Detail Temuan per Kategori

### A. Backend & Business Logic Invariants
- **Concurrency & Booking Lock (`features/booking/server/booking.service.ts`):**
  - **Status:** PASS / SECURE.
  - Penulisan booking dilakukan di dalam transaksi Prisma `Serializable` dengan raw lock `SELECT id FROM courts WHERE id = ? FOR UPDATE`. Race condition pada booking bersamaan berhasil dicegah (diverifikasi via `tests/booking.test.ts`).
- **Pricing Validation (`features/booking/lib/pricing.ts`):**
  - **Status:** PASS / SECURE.
  - Harga dihitung 100% server-side menggunakan nilai dari tabel `Config` (`PRICE_PER_HOUR`, default 50.000). Harga yang dikirim client diabaikan total.
- **Engine Ketersediaan & Timezone (`features/booking/server/availability.service.ts` & `shared/lib/date.ts`):**
  - **Status:** PASS / SECURE.
  - Tanggal disimpan dan diproses sebagai **Midnight UTC** (`shared/lib/date.ts`) untuk mencegah pergeseran tanggal H+1/H-1 akibat WIB (UTC+7). Slot terblokir jika status `WAITING_VERIFICATION`, `CONFIRMED`, atau `PENDING_PAYMENT` yang belum melewati `expiresAt`.

### B. Pembayaran & Webhook (Midtrans)
- **Signature Security (`features/payment/server/midtrans.webhook.ts`):**
  - **Status:** PASS / SECURE.
  - Verifikasi signature SHA-512 (`order_id + status_code + gross_amount + ServerKey`) dilakukan sebelum memproses status pembayaran. Gross amount dicocokkan dengan DB. Request tidak sah ditolak dengan HTTP 401.
- **Idempotensi Webhook:**
  - Notification handler menangani pemanggilan berulang dengan aman (menggunakan state machine `assertBookingStatusTransition`).

### C. Autentikasi, Otorisasi, & API Security
- **Guards & Roles (`server/auth/guards.ts`):**
  - Endpoint admin (`/api/admin/**`) diproteksi dengan `requireAdmin()`.
- **Guest Access Control (`app/api/payments/[id]/proof/route.ts` & `/api/payments/midtrans/create/route.ts`):**
  - Mutasi guest mewajibkan pencocokan nomor telepon (`userPhone`). Response `GET /api/bookings/[code]` mengembalikan data nomor telepon yang disamarkan (*masked*).

### D. Database Schema & Migration Integrity
- **Stale Physical Migrations (`prisma/migrations/`):**
  - Folder migrasi SQL fisik hanya berisi 4 migrasi awal. Model `Config`, `Blacklist`, serta kolom Midtrans di tabel `Payment` dimasukkan via `prisma db push` tanpa migrasi fisik.
  - **Risiko:** Saat deploy ke database baru menggunakan `prisma migrate deploy`, struktur database tidak akan lengkap.

### E. Dependencies & Code Health
- **Vulnerabilities (`npm audit`):**
  - **Critical:** `next` 16.3.0 (Unauthenticated RCE on Windows / Image Optimization).
  - **High:** `axios` 1.7.9, `zod` <4.6.6, `sharp` <=0.35.5, `follow-redirects`.
- **Unused Packages:**
  - `@prisma/adapter-pg`, `@prisma/adapter-libsql`, `@prisma/adapter-planetscale` dapat dihapus dari `package.json`.

---

## 4. Evaluasi File Sampah & Categorization

### A. SAFE TO REMOVE (Bisa dihapus tanpa merusak aplikasi)
1. Dependensi tidak terpakai di `package.json`: `@prisma/adapter-libsql`, `@prisma/adapter-pg`, `@prisma/adapter-planetscale`.
2. File audit markdown lama yang redundan dan usang di root directory (misal: `FINAL_AUDIT.md`, `DUPLICATION_AUDIT.md`, `SECURITY_AUDIT.md`, `CAPACITY_REPORT.md` - rekomendasi dikonsolidasikan ke `AUDIT_REPORT.md`).

### B. REVIEW REQUIRED (Butuh verifikasi sebelum dibersihkan)
1. `middleware.ts` vs `proxy.ts`: Pilih salah satu sesuai spesifikasi konvensi Next.js 16 (Next.js 16 menyarankan `proxy.ts`).
2. Script pengujian beban manual (`scripts/load-test.ts` & `scripts/_midtrans-check.ts`): Pindahkan ke folder `scripts/internal/` atau hapus jika tidak digunakan di CI.

### C. MUST KEEP (Wajib dipertahankan)
1. `prisma/schema.prisma` dan seluruh file dalam `features/`, `app/`, `shared/`, `server/`, `auth.ts`.
2. `AGENTS.md` (instruksi rule repository).

---

## 5. Prioritas Action Items Sebelum Deploy Production

### Priority 0 (P0 - Immediate / Blockers)
1. **Update Dependensi Kritis:** Upgrade `next` ke v16.4.6+ dan `axios` ke versi terbaru untuk menutup celah keamanan RCE & SSRF.
2. **Database Migration Sync:** Jalankan pemuatan migrasi SQL baru untuk tabel `Config`, `Blacklist`, dan kolom Midtrans agar `prisma/migrations/` sinkron 100% dengan `schema.prisma`.

### Priority 1 (P1 - High Priority)
1. **Cleanup Unused Dependencies:** Hapus Prisma adapters yang tidak terpakai dari `package.json`.
2. **Consolidate Middleware:** Unifikasi `middleware.ts` ke `proxy.ts` untuk menghilangkan warning build pada Next.js 16.
3. **Rebranding Consistency:** Pastikan seluruh teks UI publik bersih dari "BadmintonKu" dan terstandarisasi sebagai "OMAH GUYUB".

### Priority 2 (P2 - Medium Priority)
1. **Fix Emoji Mojibake:** Perbaiki karakter `??` pada `app/page.tsx` dengan Lucide React Icons (`BicepsFlexed` / Shuttlecock SVG custom).
2. **Clean Root Markdown Files:** Hapus 20+ file report markdown sementara yang membuat root repository berantakan.

---
*Skipped: Modifikasi file source code (Phase 1 adalah Read-Only Audit).*  
*Risk: Jangan menjalankan `npx prisma migrate dev` pada DB produksi tanpa membuat backup data terlebih dahulu.*
