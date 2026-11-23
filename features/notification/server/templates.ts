export const NOTIFICATION_TEMPLATES = {
  BOOKING_CREATED: (data: {
    courtName: string;
    date: string;
    time: string;
    bookingCode: string;
    paymentInstructions: string;
  }) =>
    `🏸 *Booking Berhasil!*\n\n` +
    `Kode booking: ${data.bookingCode}\n` +
    `Lapangan: ${data.courtName}\n` +
    `Tanggal: ${data.date}\n` +
    `Jam: ${data.time}\n\n` +
    `Simpan pesan ini. Untuk membuka tiket:\n` +
    `1. Buka halaman *Tiket Saya*\n` +
    `2. Tempel kode di atas pada kolom *Cari kode booking*\n` +
    `3. Tekan *Tambahkan*\n\n` +
    `Cara bayar:\n${data.paymentInstructions}\n\n` +
    `Terima kasih! - OMAH GUYUB`,

  PAYMENT_SUBMITTED: (data: { bookingCode: string; courtName: string; date: string; time: string }) =>
    `💰 *Bukti Pembayaran Diterima*\n\n` +
    `Booking: ${data.bookingCode}\n` +
    `Lapangan: ${data.courtName}\n` +
    `Tanggal: ${data.date}\n` +
    `Jam: ${data.time}\n\n` +
    `Pembayaran Anda sedang diverifikasi oleh admin.\n` +
    `Anda akan mendapat notifikasi setelah diverifikasi.\n` +
    `- OMAH GUYUB`,

  PAYMENT_APPROVED: (data: { bookingCode: string; courtName: string; date: string; time: string }) =>
    `✅ *Pembayaran Dikonfirmasi!*\n\n` +
    `Booking: ${data.bookingCode}\n` +
    `Lapangan: ${data.courtName}\n` +
    `Tanggal: ${data.date}\n` +
    `Jam: ${data.time}\n\n` +
    `Booking Anda telah dikonfirmasi.\n` +
    `Silakan datang tepat waktu untuk bermain.\n` +
    `Terima kasih! - OMAH GUYUB`,

  PAYMENT_REJECTED: (data: {
    bookingCode: string;
    courtName: string;
    date: string;
    time: string;
    reason: string;
  }) =>
    `❌ *Pembayaran Ditolak*\n\n` +
    `Booking: ${data.bookingCode}\n` +
    `Lapangan: ${data.courtName}\n` +
    `Tanggal: ${data.date}\n` +
    `Jam: ${data.time}\n\n` +
    `Alasan: ${data.reason}\n\n` +
    `Silakan buat booking baru atau hubungi admin.\n` +
    `- OMAH GUYUB`,

  BOOKING_CANCELLED: (data: {
    bookingCode: string;
    courtName: string;
    date: string;
    time: string;
    cancelledBy: string;
  }) =>
    `🚫 *Booking Dibatalkan*\n\n` +
    `Booking: ${data.bookingCode}\n` +
    `Lapangan: ${data.courtName}\n` +
    `Tanggal: ${data.date}\n` +
    `Jam: ${data.time}\n\n` +
    `Dibatalkan oleh: ${data.cancelledBy}\n\n` +
    `Jika ini bukan keinginan Anda, silakan hubungi admin.\n` +
    `- OMAH GUYUB`,

  BOOKING_EXPIRED: (data: { bookingCode: string; courtName: string; date: string; time: string }) =>
    `⏰ *Booking Kadaluarsa*\n\n` +
    `Booking: ${data.bookingCode}\n` +
    `Lapangan: ${data.courtName}\n` +
    `Tanggal: ${data.date}\n` +
    `Jam: ${data.time}\n\n` +
    `Waktu pembayaran telah habis (1 jam).\n` +
    `Slot telah dibuka untuk user lain.\n` +
    `Silakan buat booking baru jika masih ingin bermain.\n` +
    `- OMAH GUYUB`,

  LOOKUP_OTP: (data: { code: string; minutes: number }) =>
    `🔐 *Kode Verifikasi Tiket*\n\n` +
    `Kode: *${data.code}*\n` +
    `Berlaku ${data.minutes} menit. Jangan bagikan kode ini kepada siapa pun.\n\n` +
    `Jika Anda tidak meminta kode ini, abaikan pesan ini.\n` +
    `- OMAH GUYUB`,
} as const;

export type NotificationType = keyof typeof NOTIFICATION_TEMPLATES;
