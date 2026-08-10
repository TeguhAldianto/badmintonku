# Architecture Design - BadmintonKu

Dokumen ini mendefinisikan arsitektur teknis sistem BadmintonKu berdasarkan tech stack yang ditentukan dan dokumen PRD serta Business Logic sebelumnya.

---

## 1. Folder Structure
```text
badmintonku/
├── app/                      # Next.js 16 App Router
│   ├── (public)/             # Rute publik (User Frontend)
│   │   ├── page.tsx          # Beranda / Landing
│   │   ├── courts/           # Pilih lapangan & jadwal
│   │   └── booking/          # Form booking & upload bukti bayar
│   ├── (auth)/               # Rute autentikasi admin
│   │   └── login/            # Halaman login admin
│   ├── (admin)/              # Rute privat (Admin Dashboard)
│   │   ├── dashboard/        # Ringkasan & laporan
│   │   ├── bookings/         # Manajemen & verifikasi booking
│   │   ├── courts/           # Manajemen data lapangan
│   │   └── schedules/        # Blokir jadwal & atur operasional
│   ├── api/                  # API Routes (Backend Handlers)
│   │   ├── auth/             # Auth.js endpoints
│   │   ├── bookings/         # Booking CRUD & payment upload
│   │   └── admin/            # Admin actions (verify, block, etc.)
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Tailwind CSS v4 setup
├── components/               # Shared UI Components
│   ├── ui/                   # shadcn/ui primitives (Button, Dialog, etc.)
│   └── custom/               # Komponen spesifik (Calendar, SlotPicker)
├── services/                 # Service Layer (Business logic & external APIs)
│   ├── booking.service.ts    # Logika ketersediaan, collision, state machine
│   ├── payment.service.ts    # Logika verifikasi & upload
│   └── whatsapp.service.ts   # Integrasi gateway WhatsApp
├── repositories/             # Repository Layer (Database Data Access)
│   ├── booking.repository.ts # Query booking & Prisma calls
│   ├── court.repository.ts   # Query lapangan
│   └── user.repository.ts    # Query user/admin
├── lib/                      # Utilities & Configs
│   ├── prisma.ts             # Prisma Client singleton
│   ├── auth.ts               # Auth.js configuration
│   └── utils.ts              # Helper functions (cn, format currency, dll.)
├── schemas/                  # Validation Layer (Zod Schemas)
│   ├── booking.schema.ts     # Validasi input form booking
│   └── admin.schema.ts       # Validasi input admin (blokir, verifikasi)
├── prisma/                   # Prisma ORM
│   ├── schema.prisma         # Database schema
│   └── migrations/           # Database migrations
└── public/                   # Static assets & uploaded proofs
```
*Alasan*: Menggunakan Route Groups (`(public)`, `(auth)`, `(admin)`) untuk memisahkan layout dan hak akses secara bersih tanpa merusak URL path. Pemisahan layer (`services/`, `repositories/`, `schemas/`) menjaga kode tetap *maintainable* dan modular.

---

## 2. Route Structure
- `/` $\rightarrow$ Landing Page & Informasi Lapangan (Public)
- `/courts` $\rightarrow$ Pemilihan Lapangan & Kalender Jadwal (Public)
- `/booking?courtId=X&date=Y` $\rightarrow$ Form Pengisian Data & Pembayaran (Public)
- `/login` $\rightarrow$ Halaman Login Admin (Auth)
- `/admin/dashboard` $\rightarrow$ Ringkasan Operasional (Admin Only)
- `/admin/bookings` $\rightarrow$ Daftar & Verifikasi Booking (Admin Only)
- `/admin/courts` $\rightarrow$ Kelola Lapangan (Admin Only)
- `/admin/schedules` $\rightarrow$ Blokir Jadwal / Maintenance (Admin Only)

---

## 3. User Architecture
- **Rendering Strategy**: Menggunakan **Server Components** untuk fetch data awal (ketersediaan lapangan) dan **Client Components** interaktif untuk kalender, pemilihan slot jam, dan form *booking*.
- **State Management**: Menggunakan React local state (`useState`, `useTransition`) untuk manajemen pilihan slot waktu yang reaktif.

---

## 4. Admin Architecture
- **Protected Layout**: Seluruh rute di bawah `(admin)` dilindungi oleh *Middleware* Auth.js yang memeriksa sesi pengguna dan role `ADMIN`.
- **UI System**: Menggunakan komponen **shadcn/ui** (tabel, modal, dialog, badge status) untuk antarmuka manajemen yang cepat dan konsisten.

---

## 5. API Architecture
- **API Routes (Next.js App Router)**: Endpoint berbasis REST (`POST /api/bookings`, `PATCH /api/admin/bookings/[id]`).
- *Alasan*: Menyediakan batasan yang jelas antara frontend dan backend database, serta memudahkan integrasi dengan webhook pihak ketiga (jika ada di masa depan).

---

## 6. Service Layer
- **Lokasi**: `services/`
- **Fungsi**: Berisi fungsi bisnis murni (seperti pengecekan *collision* slot, kalkulasi harga, trigger WhatsApp, dan transisi state machine).
- *Alasan*: Menghindari *fat route handlers* (menjaga file API tetap tipis) dan mempermudah unit testing logika bisnis di masa depan.

---

## 7. Repository Layer
- **Lokasi**: `repositories/`
- **Fungsi**: Berisi seluruh interaksi database menggunakan Prisma Client.
- *Alasan*: Mengisolasi query Prisma dari service layer, sehingga jika ada perubahan ORM atau struktur query, perubahan hanya terjadi di satu tempat.

---

## 8. Validation Layer
- **Teknologi**: **Zod**
- **Lokasi**: `schemas/`
- **Fungsi**: Memvalidasi input dari user (nomor WA, tanggal, format jam) dan payload dari request admin sebelum masuk ke Service Layer.
- *Alasan*: Menjamin *type safety* secara *end-to-end* dari client hingga database.

---

## 9. Authentication Architecture
- **Teknologi**: **Auth.js (NextAuth v5)**
- **Implementasi**: Digunakan khusus untuk **Admin Authentication** (Credential Provider: username & password yang di-hash dengan bcrypt).
- *Alasan*: Standar industri untuk ekosistem Next.js, aman, dan terintegrasi baik dengan middleware App Router.

---

## 10. Authorization Architecture
- **Middleware-Based**: Next.js Middleware memeriksa token sesi pada setiap request ke `/admin/*`. Jika tidak ada sesi atau role bukan admin, user akan di-redirect ke `/login`.
- **API Protection**: Endpoint `/api/admin/*` wajib memvalidasi sesi admin di dalam handler sebelum mengeksekusi operasi database.

---

## 11. Database Architecture
- **Teknologi**: **MySQL** + **Prisma 7 ORM**
- **Skema Utama**:
  - `Admin`: Menyimpan kredensial admin.
  - `Court`: Menyimpan data 3 lapangan.
  - `Booking`: Menyimpan data transaksi penyewaan (status, tanggal, jam, total harga, data user).
  - `BlockedSchedule`: Menyimpan data blokir jadwal oleh admin.
- *Alasan*: MySQL adalah standar relasional yang stabil; Prisma 7 menyediakan type-safety yang sangat kuat untuk query kompleks (seperti pencegahan *double booking* dengan transaksi).

---

## 12. Error Handling
- **Strategy**: 
  - *Client*: Menampilkan toast notification atau error message inline menggunakan komponen UI.
  - *Server/API*: Mengembalikan format JSON standar (`{ success: false, message: "..." }`) dengan HTTP Status Code yang tepat (`400`, `401`, `409 Conflict`, `500`).
  - *Database Collision*: Menangkap exception dari *Unique Constraint Violation* Prisma saat terjadi *race condition* booking bersamaan.

---

## 13. Notification Architecture
- **Teknologi**: Service wrapper yang memanggil API WhatsApp Gateway pihak ketiga (misal: Fonnte / Wablas / Fonnte HTTP API).
- **Lokasi**: `services/whatsapp.service.ts`
- *Alasan*: Bersifat asinkron (`async/await` tanpa memblokir response HTTP utama ke user jika pengiriman WA mengalami latensi).

---

## 14. File Upload Architecture
- **Penyimpanan**: Disimpan secara lokal di direktori `public/uploads/` (untuk MVP) atau object storage.
- **Validasi**: Zod memvalidasi ekstensi file (JPG, PNG) dan ukuran maksimal (maks 2MB) sebelum file disimpan ke server.
- *Alasan*: Sederhana, sesuai skala sistem (3 lapangan, volume upload bukti transfer tidak masif), dan mudah diimplementasikan tanpa dependensi cloud eksternal yang rumit.
