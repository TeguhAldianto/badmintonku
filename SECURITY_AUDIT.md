# Security Audit Report - BadmintonKu

Laporan audit keamanan komprehensif untuk aplikasi BadmintonKu berdasarkan analisis kode sumber secara menyeluruh.

---

## 1. Authentication
- **Severity**: Secure / Low Risk
- **File**: `auth.ts`, `app/api/auth/[...nextauth]/route.ts`
- **Endpoint**: `/api/auth/*`, `/login`
- **Vulnerability**: *Credential Stuffing / Brute Force* (Mitigasi dasar)
- **Attack Scenario**: Penyerang mencoba menebak password admin secara otomatis menggunakan skrip *brute force*.
- **Recommended Fix**: Tambahkan *Rate Limiting* pada endpoint login dan rute autentikasi untuk membatasi percobaan login yang gagal.

---

## 2. Authorization
- **Severity**: Secure
- **File**: `middleware.ts`, `app/admin/layout.tsx`
- **Endpoint**: `/admin/*`
- **Vulnerability**: *Unauthorized Admin Access* (Telah dimitigasi)
- **Attack Scenario**: Pengguna biasa mencoba mengakses halaman dashboard admin secara langsung melalui URL.
- **Recommended Fix**: Middleware secara ketat memeriksa sesi aktif dan `role === "ADMIN"`, melakukan *redirect* otomatis ke beranda jika tidak memenuhi syarat.

---

## 3. IDOR (Insecure Direct Object References)
- **Severity**: Secure
- **File**: `services/payment.service.ts`, `app/api/payments/[id]/proof/route.ts`
- **Endpoint**: `/api/payments/[id]/proof`
- **Vulnerability**: *IDOR on Booking/Payment Access* (Telah dimitigasi)
- **Attack Scenario**: User A menebak UUID booking User B untuk melihat detail pembayaran atau mengunggah bukti bayar atas nama User B.
- **Recommended Fix**: Validasi kepemilikan (`booking.userPhone === userPhone` atau token sesi) pada setiap *service call* dan *API handler* sebelum mengizinkan akses.

---

## 4. Admin Privilege Escalation
- **Severity**: Secure
- **File**: `services/payment.service.ts`, `app/api/admin/payments/[id]/action/route.ts`
- **Endpoint**: `/api/admin/payments/[id]/action`
- **Vulnerability**: *Privilege Escalation* (Telah dimitigasi)
- **Attack Scenario**: User biasa memodifikasi payload request untuk menaikkan role mereka menjadi admin atau menyetujui pembayaran mereka sendiri.
- **Recommended Fix**: Otorisasi role `ADMIN` divalidasi mutlak di server-side (`session.user.role === "ADMIN"`).

---

## 5. User Ownership
- **Severity**: Secure
- **File**: `services/payment.service.ts`, `app/api/bookings/[code]/route.ts`
- **Endpoint**: `/api/bookings/[code]`
- **Vulnerability**: *Data Leakage via Ownership Bypass* (Telah dimitigasi)
- **Attack Scenario**: User melihat riwayat booking user lain dengan mengubah parameter kode booking.
- **Recommended Fix**: Validasi kombinasi kode booking dan nomor telepon atau token kepemilikan.

---

## 6. API Security
- **Severity**: Medium
- **File**: `app/api/**/*.ts`
- **Endpoint**: Seluruh rute `/api/*`
- **Vulnerability**: *Lack of Global Rate Limiting & Payload Size Limits*
- **Attack Scenario**: Penyerang membanjiri API booking dengan ribuan request per detik untuk menghabiskan sumber daya database (Denial of Service).
- **Recommended Fix**: Terapkan *Rate Limiting middleware* (misal menggunakan Upstash Redis atau *memory rate limiter*) pada API publik seperti `/api/bookings` dan `/api/availability`.

---

## 7. Input Validation
- **Severity**: Secure
- **File**: `services/booking.service.ts`, `services/availability.service.ts`
- **Endpoint**: `/api/bookings`
- **Vulnerability**: *Invalid Data Submission* (Telah dimitigasi)
- **Attack Scenario**: User mengirimkan jam mulai lebih besar dari jam selesai atau tanggal di masa lalu.
- **Recommended Fix**: Validasi parameter ketat di *service layer* (`startTime < endTime`, tanggal tidak boleh di masa lalu).

---

## 8. XSS (Cross-Site Scripting)
- **Severity**: Secure
- **File**: `app/**/*.tsx`
- **Endpoint**: Seluruh halaman frontend
- **Vulnerability**: *Stored / Reflected XSS* (Telah dimitigasi oleh React/Next.js)
- **Attack Scenario**: User memasukkan `<script>alert(1)</script>` pada kolom nama saat booking dan dieksekusi di panel admin.
- **Recommended Fix**: React secara otomatis melakukan *escaping* pada seluruh string yang dirender, mencegah eksekusi skrip mentah.

---

## 9. SQL Injection
- **Severity**: Secure
- **File**: `services/*.ts`, `lib/prisma.ts`
- **Endpoint**: Seluruh query database
- **Vulnerability**: *SQL Injection via Raw Queries* (Telah dimitigasi)
- **Attack Scenario**: Penyerang menyisipkan payload SQL melalui form input.
- **Recommended Fix**: Aplikasi menggunakan **Prisma ORM** yang secara otomatis melakukan *parameterized queries* pada setiap operasi database, mencegah injeksi SQL.

---

## 10. File Upload
- **Severity**: Secure
- **File**: `services/payment.service.ts`, `app/api/payments/[id]/proof/route.ts`
- **Endpoint**: `/api/payments/[id]/proof`
- **Vulnerability**: *Malicious File Upload / RCE* (Telah dimitigasi)
- **Attack Scenario**: Penyerang mengunggah file berbahaya berformat `.php` atau `.exe` yang disamarkan sebagai gambar.
- **Recommended Fix**: Validasi ketat MIME type (`image/jpeg`, `image/png`, `image/webp`) dan pembatasan ukuran file maksimal 2MB.

---

## 11. Secret Exposure
- **Severity**: Secure
- **File**: `.env`, `auth.ts`, `services/notification.service.ts`
- **Endpoint**: Internal Server
- **Vulnerability**: *Hardcoded Secrets* (Telah dimitigasi)
- **Attack Scenario**: Kunci API Fonnte atau Database URL bocor ke publik melalui repository GitHub.
- **Recommended Fix**: Seluruh secret disimpan di environment variables (`.env`) dan tidak pernah di-commit ke source code.

---

## 12. Cookie / Session Security
- **Severity**: Secure
- **File**: `auth.ts`, `middleware.ts`
- **Endpoint**: Auth Sessions
- **Vulnerability**: *Session Hijacking / Insecure Cookies* (Telah dimitigasi oleh NextAuth)
- **Attack Scenario**: Penyerang mencuri cookie sesi melalui serangan XSS atau jaringan tidak aman.
- **Recommended Fix**: NextAuth secara otomatis mengatur flag `HttpOnly`, `Secure`, dan `SameSite=Lax` pada cookie sesi.

---

## 13. Price Manipulation
- **Severity**: Secure
- **File**: `services/booking.service.ts`
- **Endpoint**: `/api/bookings`
- **Vulnerability**: *Client-Side Price Tampering* (Telah dimitigasi)
- **Attack Scenario**: Penyerang memodifikasi harga total menjadi Rp 1 melalui inspect element pada browser saat melakukan request booking.
- **Recommended Fix**: Harga dihitung sepenuhnya di **server-side** (`(endTime - startTime) * 50000`), mengabaikan nilai apa pun yang dikirim dari frontend.

---

## 14. Booking Manipulation
- **Severity**: Secure
- **File**: `services/booking.service.ts`, `services/availability.service.ts`
- **Endpoint**: `/api/bookings`
- **Vulnerability**: *State Bypass / Unauthorized Modification* (Telah dimitigasi)
- **Attack Scenario**: User memodifikasi status booking menjadi `CONFIRMED` tanpa melalui pembayaran.
- **Recommended Fix**: Status awal booking di-hardcode ke `PENDING_PAYMENT` di server dan hanya bisa diubah melalui alur pembayaran atau aksi admin terverifikasi.

---

## 15. Double Booking
- **Severity**: Secure
- **File**: `services/booking.service.ts`
- **Endpoint**: `/api/bookings`
- **Vulnerability**: *Race Condition / Double Booking* (Telah dimitigasi)
- **Attack Scenario**: Dua user memesan lapangan dan jam yang sama secara bersamaan.
- **Recommended Fix**: Implementasi transaksi database dengan tingkat isolasi **Serializable** dan pengecekan ganda di dalam blok transaksi (`prisma.$transaction`).

---

## 16. Payment Manipulation
- **Severity**: Secure
- **File**: `services/payment.service.ts`
- **Endpoint**: `/api/admin/payments/[id]/action`
- **Vulnerability**: *Self-Approval of Payments* (Telah dimitigasi)
- **Attack Scenario**: User mengubah status pembayaran mereka sendiri menjadi `PAID`.
- **Recommended Fix**: Validasi state machine pembayaran dan pembatasan bahwa hanya admin yang dapat mengubah status pembayaran menjadi `PAID` atau `REJECTED`.

---

## 17. Rate Limiting
- **Severity**: Low / Medium
- **File**: `app/api/**/*.ts`
- **Endpoint**: Seluruh API
- **Vulnerability**: *Absennya Pembatasan Laju Akses*
- **Attack Scenario**: Skrip otomatis melakukan *spam* pemesanan atau permintaan cek ketersediaan.
- **Recommended Fix**: Implementasikan *rate limiting* berbasis IP atau nomor telepon untuk mencegah penyalahgunaan API.

---

## 18. Sensitive Information Exposure
- **Severity**: Secure
- **File**: `app/api/**/*.ts`
- **Endpoint**: Seluruh API
- **Vulnerability**: *Detailed Error Stack Traces in Production* (Telah dimitigasi)
- **Attack Scenario**: Penyerang memicu error server untuk melihat struktur internal database melalui *stack trace*.
- **Recommended Fix**: Penanganan error mengembalikan pesan generik yang aman (`"Gagal memproses permintaan"`) tanpa mengekspos detail teknis database.
