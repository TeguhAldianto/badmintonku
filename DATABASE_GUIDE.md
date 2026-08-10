# Database Guide - BadmintonKu

Dokumen ini mendefinisikan skema database lengkap menggunakan Prisma 7 schema, aturan relasi, indeks, dan mekanisme pencegahan bentrok (*double booking*).

---

## 1. Prisma Schema (`prisma/schema.prisma`)

```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// ==========================================
// ENUMS
// ==========================================

enum Role {
  ADMIN
}

enum BookingStatus {
  PENDING_PAYMENT
  WAITING_VERIFICATION
  CONFIRMED
  CANCELLED
  REJECTED
  EXPIRED
  COMPLETED
}

enum PaymentStatus {
  UNPAID
  VERIFYING
  PAID
  REJECTED
}

// ==========================================
// MODELS
// ==========================================

model Admin {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String   // Hashed password (Bcrypt)
  name      String
  role      Role     @default(ADMIN)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("admins")
}

model Court {
  id              Int               @id @default(autoincrement())
  name            String            @unique // "Court 1", "Court 2", "Court 3"
  description     String?
  isActive        Boolean           @default(true)
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
  
  bookings        Booking[]
  blockedSlots    BlockedSlot[]

  @@map("courts")
}

model Booking {
  id              String           @id @default(cuid())
  courtId         Int
  date            DateTime         @db.Date // Tanggal sewa (YYYY-MM-DD)
  startTime       Int              // Jam mulai (misal: 8 untuk 08:00)
  endTime         Int              // Jam selesai (misal: 9 untuk 09:00)
  
  // User Info (Guest Checkout)
  userName        String
  userPhone       String           // Digunakan sebagai identifier ownership
  
  status          BookingStatus    @default(PENDING_PAYMENT)
  totalPrice      Decimal          @db.Decimal(10, 2)
  expiresAt       DateTime         // Batas waktu pembayaran sebelum EXPIRED
  
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt

  // Relations
  court           Court            @relation(fields: [courtId], references: [id], onDelete: Restrict)
  payment         Payment?
  statusHistory   BookingStatusHistory[]

  // Anti-Double Booking & Indexing
  // Compound index untuk mempercepat pencarian jadwal
  @@index([courtId, date])
  @@index([userPhone])
  @@map("bookings")
}

model Payment {
  id              String           @id @default(cuid())
  bookingId       String           @unique
  amount          Decimal          @db.Decimal(10, 2)
  proofUrl        String?          // Path file bukti transfer
  status          PaymentStatus    @default(UNPAID)
  rejectionReason String?          // Catatan admin jika ditolak
  verifiedAt      DateTime?        // Waktu verifikasi admin
  
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt

  // Relations
  booking         Booking          @relation(fields: [bookingId], references: [id], onDelete: Cascade)

  @@map("payments")
}

model BlockedSlot {
  id          Int      @id @default(autoincrement())
  courtId     Int
  date        DateTime @db.Date
  startTime   Int
  endTime     Int
  reason      String?  // Alasan blokir (maintenance, turnamen, dll.)
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  court       Court    @relation(fields: [courtId], references: [id], onDelete: Cascade)

  @@index([courtId, date])
  @@map("blocked_slots")
}

model BookingStatusHistory {
  id          String         @id @default(cuid())
  bookingId   String
  oldStatus   BookingStatus?
  newStatus   BookingStatus
  changedBy   String         // "SYSTEM", "USER", atau nama Admin
  notes       String?
  
  createdAt   DateTime       @default(now())

  // Relations
  booking     Booking        @relation(fields: [bookingId], references: [id], onDelete: Cascade)

  @@index([bookingId])
  @@map("booking_status_history")
}
```

---

## 2. Penjelasan Detail Desain

### A. Field, Type, & Relation
- **Court**: Memiliki relasi *one-to-many* ke `Booking` dan `BlockedSlot`. Menggunakan `onDelete: Restrict` agar data lapangan tidak bisa dihapus jika masih ada riwayat booking.
- **Booking**: Tabel inti transaksi. Menyimpan `courtId`, `date`, `startTime`, `endTime`, serta data kontak user (`userName`, `userPhone`).
- **Payment**: Relasi *one-to-one* dengan `Booking`. Menggunakan `onDelete: Cascade` (jika booking dihapus, data pembayaran ikut terhapus).
- **BlockedSlot**: Tabel khusus untuk mencatat jadwal yang ditutup admin (maintenance). Memiliki relasi ke `Court` dengan `onDelete: Cascade`.
- **BookingStatusHistory**: Tabel audit trail untuk mencatat setiap perubahan status booking dari waktu ke waktu.

### B. Index & Audit Requirements
- **Index**: 
  - `@@index([courtId, date])` pada tabel `Booking` dan `BlockedSlot` sangat penting untuk mempercepat *query* pengecekan ketersediaan slot pada tanggal tertentu secara instan.
  - `@@index([userPhone])` untuk memudahkan pencarian riwayat booking berdasarkan nomor WhatsApp user.
- **Audit**: `BookingStatusHistory` mencatat setiap transisi state machine secara otomatis disertai informasi `changedBy` (siapa yang mengubah) dan `notes`.

---

## 3. Cara Database Mencegah Masalah Booking yang Bentrok (Anti-Double-Booking)

Sistem mencegah *double booking* melalui 3 lapisan pengaman:

1. **Pengecekan Logika di Application/Service Layer**:
   Sebelum melakukan *insert* booking baru, service akan melakukan *query* ke database untuk memastikan tidak ada record booking lain pada `courtId` dan `date` yang memiliki irisan jam (`startTime` & `endTime`) dengan status aktif (`PENDING_PAYMENT`, `WAITING_VERIFICATION`, `CONFIRMED`) ataupun terblokir (`BlockedSlot`).

2. **Database Transaction & Isolation Level (Pessimistic / Optimistic Concurrency)**:
   Saat dua user melakukan *submit booking* pada detik yang sama untuk slot yang identik:
   - Operasi dijalankan di dalam **Prisma Interactive Transaction** (`prisma.$transaction`).
   - Query pengecekan dan *insert* dikunci menggunakan transaksi serializable / pengecekan eksklusif.
   - Jika transaksi pertama berhasil melakukan *commit*, transaksi kedua yang berjalan secara konkuren akan mendeteksi bahwa slot tersebut sudah terisi, sehingga operasi *insert* dibatalkan dan mengembalikan *error* slot sudah tidak tersedia.

3. **Pembersihan Slot Kadaluarsa (Expired Booking)**:
   Booking dengan status `PENDING_PAYMENT` yang melewati batas waktu (`expiresAt`) secara otomatis diubah statusnya menjadi `EXPIRED` oleh *cron job* atau saat *query* ketersediaan dijalankan, sehingga slot tersebut otomatis terbuka kembali untuk user lain.
