# UI/UX AUDIT REPORT — OMAH GUYUB (BadmintonKu)

Tanggal audit: 17 November 2026
Cakupan: seluruh UI publik, alur reservasi/pembayaran, dan panel admin.
Sifat audit: **read-only**. Tidak ada source code, business logic, database, atau branding yang diubah.

---

## 1. Executive Summary

Aplikasi ini secara struktural sudah *usable*: halaman publik terbuka tanpa error, alur reservasi tamu (pilih tanggal → pilih slot → isi identitas → buat reservasi) dapat diselesaikan, status tidak hanya dibedakan lewat warna, dan sebagian besar halaman memiliki empty state serta loading state dasar.

Namun, hasil audit **tidak** mendukung klaim "sudah user-friendly" secara menyeluruh. Masalah nyata yang terbukti dari kode dan runtime:

- **Identitas produk tidak konsisten**: judul tab/metadata bertuliskan "KLAB TANGKIS", sedangkan seluruh UI menulis "OMAH GUYUB" (`app/layout.tsx:24-27`).
- **Tidak ada akun customer/registrasi**: login hanya untuk admin; tiket disimpan di `localStorage`, sehingga tiket dapat hilang saat ganti perangkat/bersihkan browser.
- **Tidak ada pembatalan mandiri** padahal aturan pembatalan (minimal 3 jam sebelum jadwal) diterapkan server (`features/booking/server/booking.service.ts:295`); tidak ada UI maupun API untuk memakainya.
- **Jalur pembayaran membingungkan**: instruksi QRIS menyuruh scan QR yang tidak ada, dan teks "Transfer ke BCA ..." tetap tampil untuk metode QRIS/DIRECT.
- **Aksi finansial admin tanpa konfirmasi**: tombol "Setujui (Lunas)" langsung mengeksekusi tanpa dialog konfirmasi dan tanpa loading state.
- **Aksesibilitas belum WCAG 2.2 AA**: banyak pasangan warna gagal kontras (dihitung), fokus keyboard tidak terlihat pada mayoritas tombol kustom, dan tiga modal tidak menangkap fokus/Escape.
- **Teks mikro**: 177 pemakaian ukuran 9–10px, termasuk label form dan status penting.

**Skor rata-rata (kategori yang dapat diverifikasi): 2.55 / 5** — "Cukup ke bawah". Belum layak disebut production-grade dari sisi pengalaman pengguna tanpa perbaikan prioritas di bawah.

---

## 2. Audit Methodology

| Metode | Yang dilakukan | Batasan |
|---|---|---|
| Source code inspection | Seluruh `app/`, `features/`, `shared/`, `components/ui` | — |
| Static metrics | Hitung pemakaian warna hardcode, ukuran font, elemen interaktif, atribut ARIA | Berbasis teks, bukan visual |
| Contrast computation | Perhitungan WCAG luminance terhadap palet aktual | Tidak menghitung opacity/blur secara visual |
| Runtime HTTP test | `next build` (sukses) lalu `next start`; 6 rute publik `200`, `/admin/dashboard` tanpa sesi `307`, 8 rute admin dengan sesi `200` | Hanya status + HTML server, **bukan** render visual |
| Interaction test di browser | **Tidak dilakukan** (tidak ada Playwright/axe di proyek) | Klaim interaksi di bawah berasal dari analisis kode |
| Responsive visual test | **Tidak dilakukan** | 7 viewport target **CANNOT BE VERIFIED** |
| Screen reader test | **Tidak dilakukan** | **CANNOT BE VERIFIED** |
| User testing dengan manusia | **Tidak dilakukan** | Semua "simulasi" adalah analisis jalur kode |

Temuan dipisahkan menjadi: (A) terbukti dari kode, (B) terbukti dari runtime HTTP, (C) risiko yang perlu validasi visual, (D) tidak dapat diverifikasi.

---

## 3. Project UI Architecture & Page Inventory

Struktur: Next.js 16 App Router + Feature-Sliced Design. UI memakai Tailwind v4, token warna di `app/globals.css:4-19`, komponen dasar Radix di `components/ui/` (hanya Button, Input, Select, Label, Calendar, Card, Sonner).

### Guest
| Rute | File | Status runtime |
|---|---|---|
| `/` | `app/page.tsx` | 200 |
| `/courts` | `app/courts/page.tsx` | 200 |
| `/booking` | `app/booking/page.tsx` | 200 |
| `/bookings` | `app/bookings/page.tsx` | 200 |
| `/bookings/[id]` | `app/bookings/[id]/page.tsx` | 200 (diuji dengan ID nyata) |
| `/login` | `app/login/page.tsx` | 200 |

### Customer
- **Tidak ada role customer.** Tidak ada registrasi, tidak ada login customer, tidak ada halaman profil.
- "Tiket Saya" = daftar kode booking di `localStorage` perangkat (`features/booking/lib/ticket-store.ts`, dipakai `site-header.tsx:25-36`).
- `/dashboard` ada tetapi **tidak ditautkan** dari header/footer mana pun → halaman yatim.

### Admin
`/admin/dashboard`, `/calendar`, `/bookings`, `/payments`, `/courts`, `/schedules`, `/reports`, `/settings` — semua `200` dengan sesi admin. Sidebar 8 menu (`features/admin/components/AdminSidebar.tsx:28-37`).

### Fitur yang disebut di brief tetapi tidak ada
- Registrasi/login customer, profil, turnamen, peserta, pertandingan, jadwal turnamen.
- Pembatalan/reschedule mandiri.
- Halaman kebijakan (refund/pembatalan), kontak/alamat/WhatsApp arena.

Status: **NOT IMPLEMENTED** — bukan cacat UI, tetapi harus dinyatakan agar ekspektasi persona tidak salah.

---

## 4. Evaluasi per Role

### 4.1 Guest
**Berhasil:** identitas "OMAH GUYUB" terlihat di header; harga/jam dan jam operasional tampil di hero (`app/page.tsx:102-127`); CTA reservasi jelas; lapangan dan jadwal dapat dilihat tanpa login.
**Gagal/membingungkan:**
- Judul tab "KLAB TANGKIS" (HIGH, UI-01).
- Tombol "Masuk" di header desktop membuka halaman **"Masuk ke akun admin"** (`app/login/page.tsx:106`); label berbeda di mobile ("Masuk admin", `site-header.tsx:187-194`) dan footer ("Panel Admin"). Guest menyangka registrasi customer ada.
- Tidak ada alamat lengkap, peta, nomor kontak, atau WhatsApp arena di mana pun (footer hanya "Senin–Minggu 08:00–21:00", `site-footer.tsx:38-45`).
- Copy sangat teknis/arsitektural ("presisi arsitektural", "Lembar A — Data teknis", "A.01", "CRI di atas 90") memperbesar beban kognitif untuk pengguna awam.

### 4.2 Customer (tamu tanpa akun)
**Berhasil:** pemilihan tanggal 7 hari, filter lapangan, matriks slot per jam, ringkasan total, form nama+WhatsApp, e-tiket, dan halaman status pembayaran tersedia. Slot terisi tidak bisa diklik dan diberi label "Terisi/Diblokir".
**Gagal/membingungkan:**
- Tiket hanya ada di perangkat; tidak ada pemulihan selain menempel kode booking 25 karakter (cuid) yang tidak pernah dikirim via WhatsApp/email (fitur notifikasi hanya untuk pengguna yang nomornya diisi, dan tidak mengirim kode).
- Tidak bisa membatalkan/mengubah booking; harus menghubungi admin, tetapi kontak admin tidak dicantumkan.
- Timer kedaluwarsa tidak berjalan: `isExpired` dihitung sekali saat mount (`app/bookings/[id]/page.tsx:66,254`), sehingga halaman yang dibiarkan terbuka tetap menampilkan tombol aktif setelah 60 menit.
- Nomor HP harus diketik ulang di halaman pembayaran (recall burden), padahal sistem menyimpannya.
- Satu reservasi multi-lapangan menghasilkan beberapa booking; setelah modal e-tiket ditutup, tidak ada tautan langsung "bayar sekarang" per tiket → harus lewat "Tiket Saya" → "Status & bayar".
- Tidak ada kebijakan pembatalan/refund yang ditampilkan sebelum membayar.

### 4.3 Admin
**Berhasil:** sidebar konsisten dengan penomoran modul; dashboard menampilkan 5 KPI + pendapatan; tabel booking/pembayaran punya aksi status; pencarian nama/HP/kode; blokir slot dan pengaturan harga/jam.
**Gagal/membingungkan:**
- **Booking lebih dari 20 baris tidak dapat diakses**: API mem-paginate (`pageSize=20`, `features/admin/server/queries.ts:157,191`) tetapi UI tidak mengirim `page` dan mengabaikan `meta` (`app/admin/bookings/page.tsx:39-58,92`). Header hanya menulis "20 baris ditampilkan".
- **Pembayaran hanya 50 terbaru** (`app/api/admin/payments/route.ts:13`), tanpa filter status di UI, meski `pendingCount` dihitung dari subset itu → angka "menunggu review" bisa menyesatkan.
- Approve/Reject tanpa konfirmasi dan tanpa loading/double-submit guard (`app/admin/payments/page.tsx:244-257`).
- "Tolak"/"Batalkan" booking langsung eksekusi (`app/admin/bookings/page.tsx:194-211`).
- Modal "Detail" tidak menampilkan bukti bayar/alasan penolakan.
- Pesan sukses memakai enum mentah: "Status diubah menjadi CONFIRMED" (LOW, bahasa campur).
- Pencarian fetch setiap ketikan tanpa debounce/abort → request race dan hasil tidak deterministik.

---

## 5. User Flow Evaluation (step-by-step)

### Flow 1 — Guest memahami layanan
Langkah: buka `/` → baca hero → cek tarif/jam → klik "Reservasi" = 3–4 langkah, jelas.
Hambatan: identitas tab salah; tidak ada kontak/alamat; CTA "Lihat lapangan" menuju halaman yang justru meminta tanggal dulu (label vs isi halaman sedikit tidak nyambung, `app/courts/page.tsx:25-31`).

### Flow 2 — Reservasi lapangan (7 langkah inti)
1. `/booking` memuat courts lalu 1 request availability **per lapangan** (waterfall, `BookingWorkspace.tsx:117-162`).
2. Pilih tanggal dari strip 7 hari (tanpa panah minggu berikutnya; lihat tanggal lain harus lewat `/courts`).
3. Pilih lapangan lewat denah SVG atau tab filter; klik denah hanya mengubah filter, tidak menggulir ke matriks.
4. Klik slot → ringkasan di kanan (desktop) / jauh di bawah (mobile).
5. Isi nama + WhatsApp di dalam struk.
6. Submit → untuk tiap grup dibuat 1 request berurutan; jika satu gagal, sisanya tidak rollback dan tidak ada ringkasan parsial yang eksplisit. Toast error generik.
7. E-tiket muncul dalam modal → tutup → harus cari jalan sendiri ke pembayaran.

Temuan kunci: langkah 2 dan 7 adalah friksi terbesar; langkah 6 berisiko menimbulkan kebingungan "sudah jadi atau belum?".

### Flow 3 — Pembayaran
Dua jalur ditumpuk dalam satu panel: tombol besar "Bayar sekarang via Midtrans", lalu blok "Unggah bukti transfer manual" dengan instruksi yang **selalu** menyebut BCA, apa pun metode yang dipilih (`app/bookings/[id]/page.tsx:415-445`). Metode QRIS berbunyi "Scan QRIS yang tersedia di halaman pembayaran", tetapi tidak ada gambar QR di halaman itu. Tidak ada rekomendasi jalur mana yang harus dipakai. Setelah upload, status `WAITING_VERIFICATION` ditampilkan dengan baik.

### Flow 4 — Admin operasional
Login → dashboard → sidebar. Untuk verifikasi pembayaran: `/admin/payments` → Review → lihat bukti → isi alasan (opsional untuk approve) → Setujui. Tidak ada konfirmasi; setelah sukses tidak ada undo. Untuk booking lama: tidak dapat dijangkau lewat UI (pagination).

### Flow 5 — Turnamen
**NOT IMPLEMENTED** di aplikasi.

---

## 6. Navigation & Information Architecture

- Header: 4 item (Beranda, Lapangan, Reservasi, Tiket Saya) + CTA Tiket Saya; aktif state jelas (`site-header.tsx:69-88`).
- Mobile: drawer tanpa fokus manajemen, tanpa Escape, dan tombolnya 36px (di bawah target 44px).
- Tidak ada breadcrumb; halaman dalam (`/bookings/[id]`) hanya punya tombol keluar di bawah.
- `/dashboard` yatim; tidak ada tautan dari mana pun.
- Naming tidak konsisten: "Masuk" (desktop) vs "Masuk admin" (mobile) vs "Panel Admin" (footer) untuk tujuan yang sama.
- Admin: 8 menu bernomor, konsisten, mudah dipindai; collapse sidebar memakai tooltip `title` (bukan aksesibel penuh).
- Halaman `/courts` menyuruh pilih tanggal dulu sebelum melihat unit — informasi lapangan sebenarnya tidak membutuhkan tanggal; friksi tambahan.

---

## 7. Visual Design & Design System

**Konsisten:** radius 2px, border 1px navy, tipografi mono uppercase untuk label, palet tanpa hijau (cobalt=lunas, terracotta=menunggu, arsir=batal) yang punya makna tetap dan didokumentasikan (`shared/components/status-badge.tsx:3-51`). Status juga disertai teks, bukan warna saja — ini nilai plus nyata.

**Tidak konsisten:**
- Token didefinisikan (`globals.css:4-19`) tetapi ada **455 pemakaian warna hex hardcode** di TSX. Mengubah branding berarti menyunting ratusan titik.
- 4 kelas hover mati di header: `hover:bg-text-terracotta`, `hover:border-text-terracotta`, `hover:text-text-terracotta` (`site-header.tsx:48,117,134`) tidak ada di CSS hasil build (diverifikasi: tidak ditemukan di `.next/static/**/*.css`). Hover tombol utama "Tiket Saya" dan tombol keluar tidak berubah warna.
- Halaman error/loading memakai `bg-gray-200`, `text-gray-600`, dan kelas `container-app` yang **tidak terdefinisi** (`app/booking/error.tsx:12-14`, `app/booking/loading.tsx:3`, `app/courts/*`).
- Label status slot admin berbahasa Inggris "Pending" (`features/booking/lib/slots.ts:15`) di tengah UI Indonesia.
- 177 pemakaian `text-[9px]`/`text-[10px]`, termasuk label form dan teks status; banyak yang `uppercase tracking-wider` sehingga terbaca seperti dokumen teknis, bukan aplikasi konsumen.
- Hero mendominasi copy teknis; informasi yang dicari pengguna (lokasi, kontak, kebijakan) tidak ada.

---

## 8. Form Usability

| Form | Label | Validasi inline | Pesan error | Loading | Catatan |
|---|---|---|---|---|---|
| Login admin | Ya, `htmlFor` | Tidak | `role="alert"` (baik) | Ya | Bagus; tambah toggle password (minor) |
| Reservasi (nama/HP) | Ya | Hanya HTML `required/minLength` | Toast; tidak ada `aria-invalid`/`aria-describedby` | Ya | Tanpa `autoComplete`, tanpa hint format HP selain placeholder |
| Filter/pencarian admin | **Tidak ada `<label>`** | — | — | — | Placeholder saja |
| Review pembayaran | Ya (alasan) | Manual via toast | Toast | **Tidak** | Bisa double-submit |
| Blokir jadwal | `<span>` bukan `<label>` untuk 3 Select | Tidak | Toast | **Tidak** | Select tidak punya accessible name |
| Pengaturan | Ya | Tombol disabled tanpa penjelasan | Toast | Ya | User tidak tahu kenapa tombol mati |
| Edit lapangan inline | **Tidak ada label** | Tidak | Toast | **Tidak** | Input di dalam sel tabel |

Tidak ada form yang memakai validasi field-level yang terhubung ke input (`aria-invalid`, `aria-describedby`, error per field). Semua kesalahan tampil sebagai toast global yang hilang setelah beberapa detik. Tidak ada satu pun `onKeyDown`/`Escape` handler selain denah SVG.

Konsistensi frontend/backend cukup baik: pesan server berbahasa Indonesia dan spesifik (`booking.service.ts:104-204`, `payment.service.ts:81-92`).

---

## 9. Responsive Design

**CANNOT BE VERIFIED secara visual** (tidak ada browser automation). Risiko statis yang terbukti dari kelas CSS:

| Area | Risiko | Bukti |
|---|---|---|
| Admin shell | `h-screen overflow-hidden` memakai `100vh`, bukan `100dvh`; pada browser mobile dengan URL bar dinamis, header/footer dapat terpotong | `admin-shell.tsx:20` |
| Tabel admin | `min-w-[760px..960px]` + `overflow-x-auto`; pada 320px hanya ~1/3 kolom terlihat, tanpa kolom sticky | `admin/bookings/page.tsx:131`, `payments:101`, `courts:110` |
| Strip tanggal | 7 tombol `min-w-[86px]` = ~602px, scroll horizontal dengan scrollbar disembunyikan → tidak ada affordance | `BookingWorkspace.tsx:372-411` |
| Denah SVG | Label teks 8–10px di dalam SVG 760px yang diperkecil ke lebar ~320px menjadi sangat kecil | `interactive-floorplan.tsx:160-212` |
| Touch target | Banyak tombol 24–36px (menu header 36px, hapus jam ~20px, tombol sidebar 28px) < 44px | `site-header.tsx:143-151`, `reservation-receipt.tsx:112-125` |
| `overflow-x: hidden` di body | Menyembunyikan overflow tak sengaja alih-alih memperbaikinya | `globals.css:33` |

---

## 10. Accessibility (WCAG 2.2 AA)

### Kontras — dihitung, bukan diasumsikan
| Pasangan | Rasio | Standar |
|---|---|---|
| `#C84B31` pada `#F5F3EE` | **4.20** | Gagal AA teks normal (butuh ≥4.5) |
| `#C84B31` pada `#FAF9F6` | **4.43** | Gagal AA teks normal |
| `#FAF9F6` pada `#C84B31` | **4.43** | Gagal AA teks tombol 12px bold (bukan "large text") |
| `#6E6A61` pada `#EAE6DD` | **4.33** | Gagal AA teks normal |
| `#C84B31` pada `#141824` | **3.80** | Gagal AA teks normal |
| `#6E6A61` pada `#F5F3EE` | 4.86 | Lolos (tipis) |
| `#1E3A8A` pada `#FAF9F6` | 9.84 | Lolos |

Dampak: label modul kecil ("Modul 03", "Lembar 02") terracotta di atas chalk, label muted di header tabel birch, dan teks tombol terracotta putih gagal kontras.

### Fokus keyboard
- Dari 45 `<button>` dan 31 `<Link>`, hanya 13 file punya kelas `focus:`/`focus-visible:`.
- Input mengganti `outline-none` dengan perubahan border 1px (`reservation-receipt.tsx:157`, `login/page.tsx:140`) → indikator fokus lemah.
- Logo header memakai `focus:outline-none` **tanpa pengganti** (`site-header.tsx:47`) → fokus pertama hilang.
- Slot jam, strip tanggal, tombol hapus jam, tombol sidebar, dan tombol modal tidak punya gaya fokus.

### Semantik & ARIA
- `role="tablist"`/`role="tab"` pada filter lapangan tanpa `tabpanel`, tanpa roving tabindex, tanpa navigasi panah (`schedule-matrix.tsx:36-67`) — lebih membingungkan screen reader daripada tombol biasa.
- Tiga modal (`ETicketModal`, detail booking, review pembayaran) dan drawer sidebar: `aria-modal="true"` tanpa focus trap, initial focus, Escape, atau `inert` latar.
- Duplicate `id="e-ticket-heading"` dan `id="printable-ticket"` saat beberapa tiket tampil (`e-ticket-modal.tsx:117,124`).
- Filter admin dan Select jadwal tidak punya nama aksesibel; ikon tombol ada yang tanpa `aria-label` (tombol submit/cari mengandalkan teks, aman).
- Denah SVG: `role="group"` + tiap lapangan `role="button" tabIndex=0` + Enter/Space — **baik**, tetapi tanpa style fokus.
- `aria-live="polite"` untuk ringkasan pilihan slot (`BookingWorkspace.tsx:527-539`) — **baik**.
- Tombol slot terisi berupa `<div aria-disabled>` yang tidak fokusabel dan tidak diumumkan sebagai tombol — status tidak terbaca keyboard/screen reader.
- Alt gambar bukti transfer generik ("Bukti transfer") — kurang deskriptif.
- Tidak ada skip link ke konten.
- 177 teks 9–10px memperburuk low-vision.

### Lain
- Status memakai teks + warna + arsir (tidak hanya warna) — **lolos prinsip 1.4.1**.
- `lang="id"` sudah benar.

---

## 11. Interaction & State Audit

**Baik:** toast Sonner dengan gaya konsisten; loading spinner pada submit reservasi, login, upload; `aria-pressed` pada slot/tanggal; e-tiket dapat dicetak; skeleton denah dan matriks; empty state di tiket, booking admin, pembayaran, laporan.

**Masalah:**
- Tidak ada konfirmasi untuk aksi destruktif/finansial (approve, reject, batalkan, nonaktifkan lapangan, buka blokir).
- Tidak ada loading/disabled saat approve/reject/save lapangan/blokir jadwal → double submit.
- Fetch gagal pada admin ditampilkan sebagai **empty state palsu** ("Tidak ada booking yang cocok", "Tidak ada data pembayaran"), bukan error dengan retry.
- Fetch availability per lapangan gagal ditelan menjadi array kosong → "Jadwal belum tersedia" (menyesatkan, `BookingWorkspace.tsx:126-140`).
- Modal e-tiket menampilkan QR dekoratif (hash, `aria-hidden`) tetapi teks menyuruh "Pindai di meja resepsionis" — **QR tidak dapat dipindai**. Ini menyesatkan customer dan resepsionis.
- Halaman pembayaran tidak memperbarui status otomatis; harus klik "Cek status Midtrans" manual, dan tombol itu hanya muncul jika `midtransOrderId` sudah ada.
- Metode pembayaran `DIRECT` (bayar di tempat) tetap meminta upload bukti.
- Alasan penolakan terakhir tetap tersimpan saat admin membuka pembayaran lain (state tidak di-reset sampai aksi sukses).
- Pencarian admin per ketikan tanpa debounce.

---

## 12. Cognitive Load & Nielsen Heuristics

| # | Heuristic | Hasil | Bukti |
|---|---|---|---|
| 1 | Visibility of system status | **Sebagian** | Spinner & toast ada; timer kedaluwarsa statis; status pembayaran manual |
| 2 | Match with real world | **Gagal sebagian** | Jargon "Lembar/Dokumen/arsitektural", enum "CONFIRMED", "Pending", instruksi QRIS fiktif |
| 3 | User control & freedom | **Gagal** | Tidak ada cancel/reschedule customer; modal tanpa Escape/backdrop close |
| 4 | Consistency & standards | **Gagal sebagian** | "Masuk"/"Masuk admin"; "KLAB TANGKIS" vs OMAH GUYUB; gray vs palet brand; dead hover classes |
| 5 | Error prevention | **Gagal** | Aksi finansial tanpa konfirmasi; validasi hanya toast; tidak ada guard double-submit |
| 6 | Recognition over recall | **Gagal sebagian** | Harus mengetik ulang nomor HP; kode booking harus diingat/ditempel manual |
| 7 | Flexibility & efficiency | **Cukup** | Filter/pencarian ada; tidak ada pagination, debounce, shortcut, bulk action |
| 8 | Aesthetic & minimalist | **Cukup** | Layout rapi dan konsisten, tetapi terlalu banyak mikro-teks teknis |
| 9 | Error recovery | **Gagal sebagian** | Pesan server jelas, tetapi tidak ada retry state, error per field, atau diagnosa di UI |
| 10 | Help & documentation | **Gagal** | Tidak ada FAQ, kontak, kebijakan pembatalan/refund, atau bantuan pembayaran |

---

## 13. Temuan & Klasifikasi Severity

| ID | Severity | Halaman/Komponen | Deskripsi (bukti) | Dampak |
|---|---|---|---|---|
| UI-01 | **HIGH** | Root metadata | `title: "KLAB TANGKIS"` sementara UI "OMAH GUYUB"; tidak ada metadata per halaman (`app/layout.tsx:24-27`) | Tab/bookmark/share salah brand; kepercayaan turun |
| UI-02 | **CRITICAL** | `/admin/payments` | "Setujui (Lunas)" tanpa dialog konfirmasi/loading; aksi langsung mengubah status finansial (`page.tsx:244-257`) | Salah klik = booking lunas tanpa pembayaran sah |
| UI-03 | **CRITICAL** | `/bookings/[id]` | QRIS menyuruh scan QR yang tidak ada; semua metode menampilkan instruksi transfer BCA (`constants.ts:7`, `page.tsx:415-445`) | Pengguna QRIS bingung/tertahan; bukti diunggah ke metode salah |
| UI-04 | **HIGH** | Seluruh customer flow | Tidak ada UI/API pembatalan padahal `cancelBooking` ada dan aturan 3 jam berlaku (`booking.service.ts:274-295`) | Customer tidak bisa mengendalikan booking; beban admin |
| UI-05 | **HIGH** | `ticket-store`, header | Tiket hanya di `localStorage`; tidak ada akun/email/WhatsApp berisi kode; kode 25 karakter | Booking (termasuk yang sudah dibayar) bisa hilang permanen bagi user |
| UI-06 | **HIGH** | `/bookings/[id]` | Timer/payment window statis dihitung saat mount; tidak ada hitung mundur (`page.tsx:66,254`) | Tombol bayar masih aktif padahal sudah kedaluwarsa; gagal di server |
| UI-07 | **HIGH** | `/admin/bookings` | UI mengabaikan `meta` pagination; hanya 20 booking terbaru dapat dilihat (`page.tsx:39-58`, `queries.ts:157`) | Booking lama tidak dapat ditemukan/diverifikasi |
| UI-08 | **HIGH** | Modals & drawer | Tanpa focus trap, initial focus, Escape, dan scroll lock (`e-ticket-modal`, `admin/bookings`, `admin/payments`, `AdminSidebar`) | Pengguna keyboard/screen reader "hilang" di belakang modal; aksesibilitas gagal |
| UI-09 | **HIGH** | Focus styles | Mayoritas tombol/link/input tanpa indikator fokus; logo `focus:outline-none` tanpa pengganti; input mengganti outline dengan border 1px | WCAG 2.4.7/1.4.11 gagal; navigasi keyboard tidak mungkin diandalkan |
| UI-10 | **HIGH** | Kontras | 5 pasangan warna di bawah 4.5:1 (lihat §10) | Teks sulit dibaca low-vision |
| UI-11 | **HIGH** | Error states admin & booking | Fetch gagal tampil sebagai empty state; availability gagal tampil "jadwal belum tersedia" | Admin menyimpulkan "tidak ada data" padahal sistem error |
| UI-12 | **HIGH** | Pesan & label login | "Masuk" mengarah ke login admin; tidak ada registrasi customer; label beda desktop/mobile/footer | Guest mengira akun customer rusak/hilang |
| UI-13 | **HIGH** | E-tiket | QR palsu + teks "Pindai di meja resepsionis" (`e-ticket-modal.tsx:185-197`) | Customer/resepsionis mencoba memindai kode yang tidak valid |
| UI-14 | **MEDIUM** | Admin actions | Tolak/batalkan/nonaktifkan lapangan/buka blokir tanpa konfirmasi; tanpa loading state | Aksi destruktif tak sengaja; double submit |
| UI-15 | **MEDIUM** | Forms admin | Input pencarian, filter, edit lapangan, dan 3 Select jadwal tanpa label/nama aksesibel | Screen reader tidak tahu field apa |
| UI-16 | **MEDIUM** | Validasi form | Tidak ada error per field/`aria-invalid`; hanya toast; HTML `required` memakai bahasa browser | Pengguna tidak tahu field mana salah, terutama mobile |
| UI-17 | **MEDIUM** | Filter lapangan | `role="tablist"` tanpa pola tab lengkap (`schedule-matrix.tsx:36-67`) | Screen reader mengumumkan tab yang tidak berfungsi seperti tab |
| UI-18 | **MEDIUM** | E-tiket multi | ID duplikat `e-ticket-heading`/`printable-ticket` (`e-ticket-modal.tsx:117,124`) | `aria-labelledby` salah sasaran |
| UI-19 | **MEDIUM** | `/booking` | Date strip 7 hari tanpa kontrol minggu berikutnya; scrollbar disembunyikan | Pengguna tidak tahu cara melihat tanggal lain |
| UI-20 | **MEDIUM** | `/booking` mobile | Ringkasan+form berada jauh di bawah matriks; tidak ada sticky CTA (komponen `sticky-booking-cta.tsx` ada tetapi tidak dipakai) | Pengguna mobile kehilangan konteks setelah memilih slot |
| UI-21 | **MEDIUM** | Submit multi-booking | Submit berurutan; gagal di tengah tidak rollback dan pesan tidak menyebut booking mana yang berhasil | Pengguna bingung, risiko double booking saat mencoba ulang |
| UI-22 | **MEDIUM** | Admin payments | Hanya 50 pembayaran terbaru; tidak ada filter status; `pendingCount` dihitung dari subset | Antrean verifikasi bisa tidak terlihat |
| UI-23 | **MEDIUM** | Search admin | Fetch setiap keystroke tanpa debounce/abort | Hasil berkedip/race, beban API |
| UI-24 | **MEDIUM** | Design tokens | 455 warna hex hardcode; 4 kelas hover tidak valid; halaman error memakai gray & `container-app` tak terdefinisi | Branding sulit dirawat; hover hilang; error page di luar sistem |
| UI-25 | **MEDIUM** | Typography | 177 teks 9–10px, termasuk label & status | Readability buruk, terutama mobile |
| UI-26 | **MEDIUM** | Copy teknis | "Lembar 01", "Dokumen #01", "A.01", "CRI > 90", "presisi arsitektural" | Beban kognitif tinggi untuk pemilik tujuan sederhana: sewa lapangan |
| UI-27 | **LOW** | Pesan status | Toast enum Inggris "CONFIRMED"; slot "Pending"; `PAYMENT_METHOD` uppercase mentah | Bahasa tidak konsisten |
| UI-28 | **LOW** | Format tanggal | Struk reservasi menampilkan `YYYY-MM-DD` mentah; tempat lain "Senin, 17 November 2026" (`reservation-receipt.tsx:102`) | Inkonsistensi kecil |
| UI-29 | **LOW** | `/dashboard` | Halaman yatim, tidak ada tautan navigasi | Halaman mati membingungkan jika ditemukan |
| UI-30 | **LOW** | Component hygiene | `sticky-booking-cta`, `nearest-available`, `availability-grid`, `horizontal-date-selector` tidak diimpor | Utang perawatan, bukan dampak UI langsung |
| UI-31 | **LOW** | Fonts | `@import` Google Fonts di CSS **dan** `next/font` di layout | Unduhan font ganda; potensi FOUT/slow first paint |
| UI-32 | **LOW** | Admin settings | Tombol disabled tanpa alasan tertulis saat jam buka ≥ tutup | User tidak tahu cara memperbaiki |

---

## 14. Usability Scoring

Skala 1–5. Rata-rata hanya dari kategori yang dapat diverifikasi.

| Kategori | Skor | Alasan berbasis bukti |
|---|---|---|
| Navigation | 3 | Header 4 item + sidebar admin rapi; namun `/dashboard` yatim, label login ambigu, tanggal lain butuh halaman berbeda |
| Information Architecture | 3 | Publik jelas; tiket device-bound dan tidak ada akun membuat model mental "riwayat" rapuh |
| Visual Hierarchy | 3 | Judul/aksen konsisten; 177 mikro-teks mengaburkan prioritas |
| Typography | 2 | Dominasi mono uppercase 9–10px untuk label/isi penting |
| Color & Contrast | 2 | 5 pasangan gagal AA; palet status sendiri baik |
| Form Usability | 2 | Label dasar ada, tetapi tanpa error per field, tanpa hint format, admin form tanpa label |
| Interaction Design | 2 | Tanpa konfirmasi aksi berisiko, tanpa focus/Escape modal, tanpa guard double submit |
| User Flow | 3 | Reservasi dapat diselesaikan; pembayaran membingungkan; tidak ada cancel; timer statis |
| Responsive Design | **NOT VERIFIED** | Tidak ada pengujian visual; risiko statis tinggi (100vh, tabel 960px, target <44px) |
| Accessibility | 2 | Kontras, fokus, modal, label, ARIA tab gagal |
| Feedback & Error Handling | 3 | Toast/loading/empty state ada; error fetch menyamar sebagai data kosong |
| Cognitive Load | 3 | Struktur terbaca; jargon dan dua jalur pembayaran menambah beban |
| **Rata-rata** | **2.55** | Cukup-bawah; belum layak production dari sisi UX |

---

## 15. Prioritas Rekomendasi (sebelum rilis)

### P0 — wajib sebelum menerima uang nyata
1. Konfirmasi + loading + disable untuk approve/reject pembayaran dan semua aksi status booking.
2. Perbaiki jalur pembayaran: tampilkan QRIS yang benar **atau** hapus opsi QRIS; sembunyikan instruksi transfer untuk metode non-transfer; tandai satu jalur sebagai rekomendasi.
3. Tambahkan pagination/filter yang benar di admin bookings & payments (pakai `meta.total`), dan tampilkan error + retry, bukan empty state.
4. Ganti QR dekoratif dengan kode booking bertulis atau hapus klaim "pindai".
5. Samakan identitas: metadata `OMAH GUYUB`, metadata per halaman; perjelas "Masuk Admin" dan hapus ekspektasi registrasi customer.

### P1 — alur & kepercayaan customer
6. Hitung mundur kedaluwarsa live dan nonaktifkan tombol tepat waktu; jelaskan langkah setelah kedaluwarsa.
7. Sediakan pembatalan mandiri (API + UI) sesuai aturan 3 jam, atau tampilkan kontak admin yang jelas.
8. Tampilkan kode booking di e-tiket yang bisa disalin, plus kirim kode via WhatsApp/email saat booking dibuat; tampilkan panduan pemulihan tiket di `/bookings`.
9. Tambahkan tautan "Bayar tiket ini" langsung dari modal e-tiket dan ringkasan multi-booking yang eksplisit (berhasil/gagal per booking).
10. Tambahkan kebijakan pembatalan/refund, alamat, peta, dan kontak arena.
11. Tambahkan kontrol minggu berikutnya pada strip tanggal dan sticky ringkasan/CTA di mobile (pakai komponen yang sudah ada).

### P2 — aksesibilitas & konsistensi
12. Ganti semua `outline-none` dengan `focus-visible` ring yang kontras; beri style fokus pada slot, tanggal, sidebar, dan modal.
13. Focus trap + Escape + scroll lock + `aria-labelledby` unik untuk semua modal/drawer; `inert` latar.
14. Naikkan kontras ke ≥4.5:1 (gelapkan terracotta untuk teks kecil; jangan pakai putih di atas terracotta untuk teks 12px).
15. Naikkan ukuran minimum teks body/label ke 12–14px; sisakan 9–10px hanya untuk metadata dekoratif.
16. Label/nama aksesibel untuk filter admin, Select jadwal, dan input inline; error per field dengan `aria-invalid` + `aria-describedby`.
17. Perbaiki `role=tablist` menjadi tombol filter biasa atau implementasikan pola tab penuh.
18. Target sentuh ≥44px untuk menu, hapus jam, dan tombol modal.
19. Bersihkan token: pakai `text-terracotta` dsb. (bukan `text-text-terracotta`), ganti warna hex dengan token, perbaiki halaman error/loading.

### P3 — polish
20. Hilangkan jargon teknis dari copy utama; pertahankan sebagai detail sekunder.
21. Debounce pencarian admin; abort request lama.
22. Hapus komponen tak terpakai; hapus `@import` Google Fonts ganda.
23. Ganti enum mentah dengan label Indonesia; samakan format tanggal.
24. Tambahkan halaman/tautan `/dashboard` atau hapus.

---

## 16. Unverified Areas (CANNOT BE VERIFIED)

- Tampilan visual aktual pada 320/375/430/768/1366/1440/1920 px (tidak ada browser automation).
- Ada/tidaknya overflow horizontal nyata, layout shift, dan CLS (hanya risiko statis yang dicatat).
- Pengujian screen reader nyata (NVDA/VoiceOver/TalkBack).
- Pengujian keyboard end-to-end di browser.
- Kontras efektif untuk warna dengan opacity (`/70`, `/10`) dan `backdrop-blur`.
- Perilaku Midtrans Snap di perangkat nyata (popup, redirect, status callback).
- Perilaku lintas browser (`<input type=date>`, `Intl`, `localStorage`).
- Pengujian dengan pengguna manusia (semua evaluasi flow adalah simulasi berbasis kode).
- Aksesibilitas `next/image` bukti transfer pada ukuran asli.
- Turnamen/pendaftaran peserta/pertandingan: fitur tidak ada, tidak dapat dinilai.

---

## 17. Final Assessment

Jawaban langsung atas pertanyaan audit:

1. **Pengguna baru memahami website?** Sebagian. Pesan "sewa lapangan" jelas, tetapi brand di tab salah dan jargon teknis mendominasi.
2. **Navigasi mudah?** Ya untuk 4 menu utama dan sidebar admin; tidak untuk melihat tanggal di luar 7 hari, halaman yatim, dan label login ambigu.
3. **Customer dapat memesan tanpa kebingungan?** Dapat, dengan friksi pada pemilihan tanggal non-7-hari dan handoff pembayaran.
4. **Pembayaran mudah dipahami?** **Tidak.** Dua jalur bercampur, QRIS tanpa QR, instruksi BCA untuk semua metode, timer statis.
5. **Pendaftaran turnamen intuitif?** Tidak berlaku — fitur tidak ada.
6. **Admin efisien?** Sebagian. Dashboard dan aksi cepat baik; pagination hilang, aksi berisiko tanpa konfirmasi, error tampil sebagai data kosong.
7. **Nyaman di smartphone?** **Tidak dapat diverifikasi**; secara statis ada risiko `100vh`, tabel lebar, dan target sentuh kecil.
8. **Elemen interaktif memberi feedback?** Sebagian; banyak tombol tanpa loading/konfirmasi/fokus.
9. **Form mudah dipahami?** Sebagian; label dasar ada, error per field tidak.
10. **Memenuhi accessibility?** **Tidak** untuk WCAG 2.2 AA berdasarkan bukti kontras, fokus, modal, dan label.
11. **Masalah paling serius?** Approve pembayaran tanpa konfirmasi, jalur QRIS yang mustahil, tiket device-bound tanpa pemulihan, pagination admin yang menyembunyikan data, dan kegagalan aksesibilitas fokus/kontras.
12. **Yang harus diperbaiki sebelum rilis?** Seluruh P0 dan P1 di §15.

**Kesimpulan:** Fondasi visual dan alur reservasi cukup kuat, tetapi aplikasi belum memenuhi standar user-friendly, accessible, dan aman-untuk-dipakai secara operasional. Skor 2.55/5 mencerminkan produk yang **dapat didemokan**, belum **dapat dipercaya untuk transaksi produksi**.
