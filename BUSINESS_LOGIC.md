# Business Logic Specification - BadmintonKu

Dokumen ini mendefinisikan aturan bisnis (business logic) dan *state machine* untuk sistem BadmintonKu berdasarkan PRD.md.

---

## 1. User Registration
- **Aturan**: Sistem tidak mewajibkan registrasi akun berbasis password untuk user umum (Guest Checkout).
- **Identifikasi**: User diidentifikasi menggunakan **Nomor WhatsApp** dan **Nama Lengkap**.
- **Tujuan**: Memangkas *friction* saat user ingin melakukan booking cepat.

## 2. User Authentication
- **User (Guest)**: Tidak memerlukan sesi login berbasis kredensial. Verifikasi kepemilikan booking dilakukan via Nomor WhatsApp atau token unik pada link riwayat pesanan (jika diimplementasikan).
- **Session**: Bersifat *stateless* untuk user umum.

## 3. Admin Authentication
- **Aturan**: Admin wajib melalui proses login dengan kredensial aman (Username/Email & Password).
- **Proteksi**: Seluruh rute halaman admin (`/admin/*`) dan API admin wajib divalidasi menggunakan token sesi/cookie yang terenkripsi.

## 4. Court Availability
- **Total Lapangan**: Terdapat tepat 3 lapangan (`Court 1`, `Court 2`, `Court 3`).
- **Ketersediaan**: Lapangan dianggap tersedia pada tanggal $D$ dan jam $H$ jika tidak ada record booking aktif dengan status `PENDING_PAYMENT`, `WAITING_VERIFICATION`, atau `CONFIRMED` pada lapangan, tanggal, dan jam tersebut.

## 5. Operating Hours
- **Jam Buka**: 08:00 WIB.
- **Jam Tutup**: 21:00 WIB.
- **Durasi Operasional**: 13 jam per hari (08:00 - 09:00, 09:00 - 10:00, ..., 20:00 - 21:00).

## 6. Time Slot Generation
- **Durasi Slot**: Tetap selama 1 jam per slot.
- **Generator**: Sistem secara otomatis menghasilkan slot waktu dari pukul 08:00 hingga 21:00 setiap harinya untuk masing-masing dari 3 lapangan.
- **Slot Terakhir**: 20:00 - 21:00 (karena slot berdurasi 1 jam dan tutup jam 21:00).

## 7. Booking Creation
- **Input**: Tanggal, Pilihan Lapangan, Pilihan Jam (bisa lebih dari 1 jam jika berurutan), Nama User, Nomor WhatsApp.
- **Validasi**:
  1. Tanggal tidak boleh di masa lalu (kurang dari hari ini).
  2. Jam harus berada di dalam jam operasional.
  3. Slot belum dibooking orang lain (cek *double booking*).
- **Output**: Booking dibuat dengan status awal `PENDING_PAYMENT`.

## 8. Booking Cancellation
- **Oleh User**: Dapat dilakukan sebelum pembayaran di-upload (selama status masih `PENDING_PAYMENT`) atau sebelum batas waktu *expiration*.
- **Oleh Admin**: Admin dapat membatalkan booking kapan saja (misal: jika ada kendala darurat pada lapangan). Status berubah menjadi `CANCELLED`.

## 9. Booking Expiration
- **Aturan**: Batas waktu pembayaran (misal: 60 menit sejak booking dibuat).
- **Mekanisme**: Jika dalam waktu X menit status masih `PENDING_PAYMENT`, sistem otomatis mengubah status menjadi `EXPIRED` dan melepas slot agar bisa dibooking user lain.

## 10. Payment Submission
- **Aturan**: User mengunggah bukti pembayaran (gambar format JPG/PNG, maks 2MB).
- **Efek Samping**: Status booking otomatis berubah dari `PENDING_PAYMENT` menjadi `WAITING_VERIFICATION`.

## 11. Payment Verification
- **Aktor**: Admin.
- **Validasi**: Admin mengecek mutasi rekening fisik/e-wallet.
- **Efek Samping**: Jika valid, admin klik verifikasi $\rightarrow$ Status berubah menjadi `CONFIRMED`.

## 12. Payment Rejection
- **Aktor**: Admin.
- **Validasi**: Jika bukti transfer palsu, nominal kurang, atau tidak sesuai.
- **Efek Samping**: Admin menolak $\rightarrow$ Status berubah menjadi `REJECTED`. User diberi opsi untuk upload ulang atau membuat booking baru.

## 13. Booking Completion
- **Otomatis**: Sistem/Job mengubah status booking dari `CONFIRMED` menjadi `COMPLETED` setelah jam operasional/waktu sewa pada tanggal tersebut telah lewat.

## 14. Blocked Schedule
- **Aktor**: Admin.
- **Fungsi**: Memblokir lapangan pada tanggal & jam tertentu (untuk maintenance, turnamen internal, dll.).
- **Dampak**: Slot yang diblokir admin tidak akan muncul sebagai slot yang bisa dipilih oleh user pada sisi frontend.

## 15. Price Calculation
- **Dasar Perhitungan**: Harga per jam per lapangan (flat rate atau dinamis berdasarkan hari/jam).
- **Formula**: $\text{Total Harga} = \text{Jumlah Jam SeWA} \times \text{Tarif per Jam}$.

## 16. Double Booking Prevention
- **Aturan**: 1 lapangan tidak boleh disewa pada jam dan tanggal yang sama oleh 2 user berbeda.
- **Pencegahan**: Implementasi *Database Unique Constraint* atau *Transaction Lock* (SELECT ... FOR UPDATE) saat eksekusi insert booking baru.

## 17. Concurrent Booking
- **Skenario**: Dua user menekan tombol "Book" pada detik yang sama untuk slot yang sama.
- **Solusi**: Sistem menggunakan *Database Transaction Isolation* (Serializable / Pessimistic Locking). Transaksi pertama yang masuk akan sukses, transaksi kedua akan mendeteksi slot sudah terisi dan melempar *error* (slot sudah tidak tersedia).

## 18. Ownership Validation
- **Aturan**: User hanya dapat melihat atau membatalkan booking miliknya sendiri (diverifikasi melalui kombinasi ID Booking dan Nomor WhatsApp).

## 19. Authorization
- **Public/User**: Hanya bisa mengakses endpoint publik (lihat lapangan, lihat jadwal, buat booking, upload bukti).
- **Admin**: Wajib memiliki role `admin` yang diverifikasi lewat token/session pada setiap request manajemen (verifikasi pembayaran, blokir jadwal, dll.).

## 20. Notification Triggering
- **Trigger A (Booking Created)**: Mengirim WhatsApp saat booking dibuat (`PENDING_PAYMENT`).
- **Trigger B (Payment Confirmed)**: Mengirim WhatsApp saat status berubah menjadi `CONFIRMED`.
- **Trigger C (Booking Cancelled/Rejected)**: Mengirim WhatsApp jika diblokir/ditolak admin.

---

## 21. Booking State Machine

### Definisi Status
1. `PENDING_PAYMENT` (Menunggu pembayaran)
2. `WAITING_VERIFICATION` (Menunggu verifikasi admin)
3. `CONFIRMED` (Booking dikonfirmasi / Selesai bayar)
4. `CANCELLED` (Dibatalkan)
5. `REJECTED` (Pembayaran ditolak)
6. `EXPIRED` (Kadaluarsa karena tidak bayar)
7. `COMPLETED` (Selesai / Waktu sewa sudah lewat)

### Transisi yang Diperbolehkan (Allowed Transitions)
- `PENDING_PAYMENT` $\rightarrow$ `WAITING_VERIFICATION` (User upload bukti bayar)
- `PENDING_PAYMENT` $\rightarrow$ `EXPIRED` (Waktu pembayaran habis)
- `PENDING_PAYMENT` $\rightarrow$ `CANCELLED` (User/Admin membatalkan)
- `WAITING_VERIFICATION` $\rightarrow$ `CONFIRMED` (Admin menyetujui pembayaran)
- `WAITING_VERIFICATION` $\rightarrow$ `REJECTED` (Admin menolak pembayaran)
- `REJECTED` $\rightarrow$ `PENDING_PAYMENT` / `WAITING_VERIFICATION` (User upload ulang bukti bayar yang benar)
- `REJECTED` $\rightarrow$ `CANCELLED` (User/Admin membatalkan setelah ditolak)
- `CONFIRMED` $\rightarrow$ `COMPLETED` (Waktu sewa lapangan telah selesai)
- `CONFIRMED` $\rightarrow$ `CANCELLED` (Admin membatalkan jadwal terkonfirmasi)

### Transisi yang DILARANG (Forbidden Transitions)
- `CONFIRMED` $\rightarrow$ `PENDING_PAYMENT` (Tidak boleh mundur ke status awal setelah dikonfirmasi)
- `CONFIRMED` $\rightarrow$ `WAITING_VERIFICATION` (Tidak perlu verifikasi ulang jika sudah confirmed)
- `EXPIRED` $\rightarrow$ `CONFIRMED` (Booking yang sudah expired tidak bisa langsung di-confirm tanpa buat baru)
- `CANCELLED` $\rightarrow$ *Apapun* (Status `CANCELLED` adalah *terminal state* untuk pembatalan, tidak bisa diubah kembali kecuali membuat booking baru)
- `COMPLETED` $\rightarrow$ *Apapun* (Status `COMPLETED` adalah *terminal state* untuk selesai bermain)
- `REJECTED` $\rightarrow$ `CONFIRMED` (Admin tidak bisa langsung confirm tanpa melalui tahap verifikasi ulang bukti yang valid)
