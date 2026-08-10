# Product Requirements Document (PRD) - BadmintonKu

## 1. Product Overview
BadmintonKu adalah platform web booking lapangan badminton yang bertujuan untuk mendigitalisasi proses pemesanan, pengecekan jadwal, dan verifikasi pembayaran untuk pengelola lapangan dengan skala kecil (3 lapangan).

## 2. Business Objective
- Menghilangkan proses cek jadwal manual via chat.
- Menyediakan transparansi ketersediaan lapangan secara real-time bagi user.
- Menyederhanakan proses verifikasi pembayaran bagi admin.
- Mengotomatisasi notifikasi konfirmasi melalui WhatsApp.

## 3. Target Users
- **User**: Pemain badminton yang ingin menyewa lapangan.
- **Admin**: Pengelola lapangan badminton.

## 4. User Roles
| Role | Deskripsi | Akses |
| :--- | :--- | :--- |
| **User** | Pengguna umum / penyewa | Sisi Client (Frontend) |
| **Admin** | Pengelola operasional | Sisi Dashboard Admin (Backend/Private) |

---

## 5. Features Breakdown

### MUST HAVE (MVP)
**User Features:**
- **View Courts**: Melihat daftar 3 lapangan yang tersedia.
- **Schedule Viewer**: Melihat kalender ketersediaan slot jam per tanggal.
- **Booking Process**: Memilih tanggal $\rightarrow$ lapangan $\rightarrow$ jam $\rightarrow$ isi data diri $\rightarrow$ submit booking.
- **Payment Upload**: Mengunggah foto/file bukti transfer pembayaran.

**Admin Features:**
- **Payment Verification**: Review bukti pembayaran dan mengubah status booking menjadi "Confirmed".
- **Booking Management**: Melihat, mengedit, atau membatalkan booking user.
- **Court Management**: Mengelola informasi dasar 3 lapangan.
- **Schedule Control**: Memblokir jam/tanggal tertentu (untuk maintenance atau keperluan internal).
- **Basic Reporting**: Melihat daftar booking harian/bulanan.

**System Features:**
- **WhatsApp Notification**: Kirim pesan otomatis saat:
  - Booking berhasil dibuat (Instruksi bayar).
  - Pembayaran diverifikasi admin (Konfirmasi jadwal).
- **Collision Prevention**: Sistem mencegah dua user booking lapangan & jam yang sama.

**Business Rules (MUST):**
- Jam Operasional: 08:00 - 21:00.
- Durasi Slot: Per 1 jam.
- Total Lapangan: 3.

---

### SHOULD HAVE (Next Iteration)
**User Features:**
- **Booking History**: User dapat melihat riwayat booking mereka (menggunakan nomor HP sebagai identifier).
- **Cancel Booking**: User dapat mengajukan pembatalan sebelum waktu tertentu.

**Admin Features:**
- **Blacklist User**: Menandai user yang sering booking tapi tidak bayar.
- **Custom Operational Hours**: Admin bisa mengubah jam buka/tutup secara global.

---

### NICE TO HAVE (Future)
- **User Account**: Sistem login/registrasi untuk menyimpan data profil.
- **Payment Gateway**: Integrasi otomatis (Midtrans/Xendit) sehingga tidak perlu upload bukti manual.
- **Advanced Analytics**: Grafik pendapatan bulanan dan jam tersibuk.

---

## 6. Detailed Workflows

### 6.1 Booking Flow (User)
1. User masuk ke website $\rightarrow$ Lihat daftar lapangan.
2. User pilih tanggal $\rightarrow$ Sistem menampilkan slot jam (08:00 - 21:00) untuk 3 lapangan.
3. User pilih slot yang tersedia $\rightarrow$ Isi Nama & Nomor WhatsApp.
4. Submit Booking $\rightarrow$ Status: `Pending Payment`.
5. Sistem mengirim WA Notifikasi instruksi pembayaran.

### 6.2 Payment Flow
1. User melakukan transfer bank $\rightarrow$ Upload bukti transfer di halaman booking.
2. Status berubah menjadi: `Pending Verification`.
3. Admin menerima notifikasi/melihat daftar pending $\rightarrow$ Cek rekening $\rightarrow$ Klik "Verify".
4. Status berubah menjadi: `Confirmed / Paid`.
5. Sistem mengirim WA Notifikasi konfirmasi jadwal.

### 6.3 Notification Flow (WhatsApp)
- **Trigger 1 (New Booking)**: "Halo [Nama], booking Lapangan [X] tgl [Tgl] jam [Jam] telah diterima. Silakan bayar ke [Rekening] dan upload bukti."
- **Trigger 2 (Payment Verified)**: "Pembayaran terverifikasi! Booking Anda untuk Lapangan [X] tgl [Tgl] jam [Jam] telah dikonfirmasi. Sampai jumpa!"

---

## 7. Data & Status Definitions

### 7.1 Booking Status
- `Pending Payment`: User baru saja booking, belum bayar/upload bukti.
- `Pending Verification`: User sudah upload bukti, menunggu cek admin.
- `Confirmed`: Pembayaran valid, slot dikunci.
- `Cancelled`: Booking dibatalkan oleh admin/user.
- `Completed`: Jam main sudah terlewati.

### 7.2 Payment Status
- `Unpaid`: Belum ada bukti bayar.
- `Verifying`: Bukti sudah diupload.
- `Paid`: Sudah diverifikasi.
- `Rejected`: Bukti tidak valid (admin beri catatan).

---

## 8. Requirements & Constraints

### 8.1 Non-Functional Requirements
- **Responsiveness**: Wajib *Mobile-First* karena user mayoritas booking lewat smartphone.
- **Performance**: Load jadwal harus cepat (< 2 detik).
- **Availability**: Website dapat diakses 24/7 untuk booking.

### 8.2 Security Requirements
- **Admin Auth**: Halaman admin wajib diproteksi password/session.
- **File Validation**: Upload bukti bayar hanya menerima format gambar (JPG, PNG) dengan limit size (misal: 2MB).
- **Input Sanitization**: Mencegah SQL Injection/XSS pada form booking.

### 8.3 UX Requirements
- **Calendar Interface**: Pemilihan tanggal harus intuitif (date picker).
- **Visual Slots**: Slot terisi harus terlihat jelas (warna berbeda) dan tidak bisa diklik.

---

## 9. Acceptance Criteria
- [ ] User dapat melakukan booking tanpa terjadi tabrakan jadwal (collision).
- [ ] Admin dapat memverifikasi pembayaran dan status berubah menjadi Confirmed.
- [ ] Admin dapat memblokir jam tertentu sehingga tidak bisa dibooking user.
- [ ] Notifikasi WhatsApp terkirim sesuai trigger yang ditentukan.
- [ ] Halaman Admin tidak bisa diakses tanpa autentikasi.
