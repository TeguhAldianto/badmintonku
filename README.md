# OMAH GUYUB — Platform Reservasi Lapangan Badminton

**OMAH GUYUB** adalah platform web booking lapangan badminton modern yang dirancang khusus untuk mendigitalisasi proses pemesanan, pengecekan jadwal real-time, pembayaran otomatis/manual, serta verifikasi operasional lapangan secara profesional.

---

## 🚀 Tech Stack

- **Framework:** Next.js 16 (App Router, React 19, Turbopack)
- **Database & ORM:** MySQL + Prisma 6 (dengan transaksi serializable & row locking)
- **Autentikasi:** NextAuth v5 (Beta)
- **Styling:** Tailwind CSS v4 + Radix UI
- **Integrasi Pembayaran:** Midtrans Snap API & Webhook
- **Notifikasi:** Fonnte WhatsApp Gateway API
- **Testing:** Vitest (71 pengujian)

---

## 🛠️ Fitur Utama

1. **Sistem Booking & Ketersediaan Real-Time**
   - Matriks jadwal per jam (08:00 - 21:00) untuk 3 lapangan.
   - Pencegahan *double-booking* (race condition) menggunakan isolasi transaksi Prisma interaktif dan `SELECT ... FOR UPDATE`.
   - Perhitungan harga mutlak server-side berdasarkan tabel konfigurasi.
2. **Pembayaran & Integrasi Gateway**
   - Mendukung pembayaran otomatis via Midtrans Snap dengan verifikasi tanda tangan SHA-512 webhook.
   - Mendukung unggah bukti transfer manual dengan validasi nomor telepon tamu.
3. **Dashboard Admin Komprehensif**
   - Manajemen verifikasi pembayaran & status pemesanan.
   - Kontrol jadwal & pemblokiran slot (*maintenance* / libur).
   - Laporan transaksi harian & bulanan.
4. **Notifikasi WhatsApp Otomatis**
   - Kirim pesan instan via Fonnte untuk instruksi pembayaran, konfirmasi, penolakan, hingga pembatalan.

---

## 📦 Perintah Pengembangan (Commands)

```bash
npm run dev            # Menjalankan development server (Next.js)
npm run build          # Membuat build produksi
npm run start          # Menjalankan server produksi
npm run lint           # Menjalankan ESLint
npm run test           # Menjalankan rangkaian unit & integration test (Vitest)
npx tsc --noEmit       # Memeriksa tipe TypeScript
npx prisma db seed     # Melakukan seeding data awal database
```

---

## ⚙️ Konfigurasi Environment (`.env`)

Salin `.env.example` menjadi `.env`, lalu isi nilai yang diperlukan:

```bash
cp .env.example .env
```

Variabel penting:

```env
DATABASE_URL="mysql://user:password@localhost:3306/omah_guyub"
AUTH_SECRET="your-nextauth-secret-key"

APP_URL="http://localhost:3000"
APP_TIME_ZONE="Asia/Jakarta"

# Midtrans (server + browser Snap)
MIDTRANS_SERVER_KEY="your-midtrans-server-key"
MIDTRANS_CLIENT_KEY="your-midtrans-client-key"
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY="your-midtrans-client-key"
MIDTRANS_IS_PRODUCTION="false"

# WhatsApp Fonnte
WHATSAPP_API_KEY="your-fonnte-whatsapp-api-key"
# atau FONNTE_API_KEY="..."

# Cron: GET /api/cron/expire-bookings dengan Authorization: Bearer <CRON_SECRET>
CRON_SECRET="your-cron-secret-key"
```

---

## 📄 Lisensi
Hak Cipta © 2026 OMAH GUYUB. Seluruh hak cipta dilindungi undang-undang.
