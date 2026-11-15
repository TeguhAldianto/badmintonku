export const NOTIFICATION_TEMPLATES = {
  BOOKING_CREATED: (data: {
    courtName: string;
    date: string;
    time: string;
    bookingCode: string;
    paymentInstructions: string;
  }) =>
    `🏸 *Booking Berhasil!*\n\n` +
    `Kode: ${data.bookingCode}\n` +
    `Lapangan: ${data.courtName}\n` +
    `Tanggal: ${data.date}\n` +
    `Jam: ${data.time}\n\n` +
    `Silakan lakukan pembayaran:\n${data.paymentInstructions}\n\n` +
    `Bukti transfer bisa diupload di aplikasi.\n` +
    `Terima kasih! - BadmintonKu`,

  PAYMENT_SUBMITTED: (data: { bookingCode: string; courtName: string; date: string; time: string }) =>
    `💰 *Bukti Pembayaran Diterima*\n\n` +
    `Booking: ${data.bookingCode}\n` +
    `Lapangan: ${data.courtName}\n` +
    `Tanggal: ${data.date}\n` +
    `Jam: ${data.time}\n\n` +
    `Pembayaran Anda sedang diverifikasi oleh admin.\n` +
    `Anda akan mendapat notifikasi setelah diverifikasi.\n` +
    `- BadmintonKu`,

  PAYMENT_APPROVED: (data: { bookingCode: string; courtName: string; date: string; time: string }) =>
    `✅ *Pembayaran Dikonfirmasi!*\n\n` +
    `Booking: ${data.bookingCode}\n` +
    `Lapangan: ${data.courtName}\n` +
    `Tanggal: ${data.date}\n` +
    `Jam: ${data.time}\n\n` +
    `Booking Anda telah dikonfirmasi.\n` +
    `Silakan datang tepat waktu untuk bermain.\n` +
    `Terima kasih! - BadmintonKu`,

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
    `- BadmintonKu`,

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
    `- BadmintonKu`,

  BOOKING_EXPIRED: (data: { bookingCode: string; courtName: string; date: string; time: string }) =>
    `⏰ *Booking Kadaluarsa*\n\n` +
    `Booking: ${data.bookingCode}\n` +
    `Lapangan: ${data.courtName}\n` +
    `Tanggal: ${data.date}\n` +
    `Jam: ${data.time}\n\n` +
    `Waktu pembayaran telah habis (1 jam).\n` +
    `Slot telah dibuka untuk user lain.\n` +
    `Silakan buat booking baru jika masih ingin bermain.\n` +
    `- BadmintonKu`,
} as const;

export type NotificationType = keyof typeof NOTIFICATION_TEMPLATES;
