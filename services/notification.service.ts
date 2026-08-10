import { prisma } from "@/lib/prisma";

export interface NotificationPayload {
  target: string; // WhatsApp number
  message: string;
  type: "BOOKING_CREATED" | "PAYMENT_SUBMITTED" | "PAYMENT_APPROVED" | "PAYMENT_REJECTED" | "BOOKING_CANCELLED" | "BOOKING_EXPIRED";
  referenceId: string; // Booking ID
}

export interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Fonnte API Configuration
const FONNTE_API_URL = "https://api.fonnte.com/send";
const FONNTE_API_KEY = process.env.FONNTE_API_KEY;

if (!FONNTE_API_KEY) {
  console.warn("FONNTE_API_KEY not set in environment variables. WhatsApp notifications will not work.");
}

export async function sendWhatsAppNotification(payload: NotificationPayload): Promise<NotificationResult> {
  if (!FONNTE_API_KEY) {
    return { success: false, error: "Fonnte API key not configured" };
  }

  try {
    const response = await fetch(FONNTE_API_URL, {
      method: "POST",
      headers: {
        "Authorization": FONNTE_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        target: payload.target,
        message: payload.message,
        countryCode: "62", // Indonesia
      }),
    });

    const data = await response.json();

    if (response.ok && data.status === true) {
      // Log successful notification
      await logNotification({
        ...payload,
        status: "SENT",
        providerResponse: JSON.stringify(data),
      });
      return { success: true, messageId: data.messageId };
    } else {
      const errorMsg = data.reason || "Unknown Fonnte error";
      await logNotification({
        ...payload,
        status: "FAILED",
        errorMessage: errorMsg,
        providerResponse: JSON.stringify(data),
      });
      return { success: false, error: errorMsg };
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Network error";
    await logNotification({
      ...payload,
      status: "ERROR",
      errorMessage: errorMsg,
    });
    return { success: false, error: errorMsg };
  }
}

async function logNotification(data: {
  target: string;
  message: string;
  type: string;
  referenceId: string;
  status: "SENT" | "FAILED" | "ERROR";
  errorMessage?: string;
  providerResponse?: string;
}) {
  try {
    await prisma.notificationLog.create({
      data: {
        target: data.target,
        message: data.message,
        type: data.type,
        referenceId: data.referenceId,
        status: data.status,
        errorMessage: data.errorMessage,
        providerResponse: data.providerResponse,
      },
    });
  } catch (logError) {
    console.error("Failed to log notification:", logError);
  }
}

// Retry mechanism for failed notifications
export async function retryFailedNotifications(maxRetries = 3) {
  const failed = await prisma.notificationLog.findMany({
    where: {
      status: { in: ["FAILED", "ERROR"] },
      retryCount: { lt: maxRetries },
    },
    take: 10,
  });

  for (const notification of failed) {
    try {
      const result = await sendWhatsAppNotification({
        target: notification.target,
        message: notification.message,
        type: notification.type as NotificationPayload["type"],
        referenceId: notification.referenceId,
      });

      await prisma.notificationLog.update({
        where: { id: notification.id },
        data: {
          retryCount: { increment: 1 },
          status: result.success ? "SENT" : notification.status,
          errorMessage: result.error,
        },
      });
    } catch (error) {
      await prisma.notificationLog.update({
        where: { id: notification.id },
        data: {
          retryCount: { increment: 1 },
          errorMessage: error instanceof Error ? error.message : "Retry failed",
        },
      });
    }
  }
}

// Message templates
export const NOTIFICATION_TEMPLATES = {
  BOOKING_CREATED: (data: { courtName: string; date: string; time: string; bookingCode: string; paymentInstructions: string }) =>
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

  PAYMENT_REJECTED: (data: { bookingCode: string; courtName: string; date: string; time: string; reason: string }) =>
    `❌ *Pembayaran Ditolak*\n\n` +
    `Booking: ${data.bookingCode}\n` +
    `Lapangan: ${data.courtName}\n` +
    `Tanggal: ${data.date}\n` +
    `Jam: ${data.time}\n\n` +
    `Alasan: ${data.reason}\n\n` +
    `Silakan upload ulang bukti pembayaran yang valid.\n` +
    `- BadmintonKu`,

  BOOKING_CANCELLED: (data: { bookingCode: string; courtName: string; date: string; time: string; cancelledBy: string }) =>
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
};

// Helper functions for easy notification sending
export async function notifyBookingCreated(booking: {
  id: string;
  userPhone: string;
  userName: string;
  courtName: string;
  date: Date;
  startTime: number;
  endTime: number;
}) {
  const time = `${booking.startTime.toString().padStart(2, "0")}:00 – ${booking.endTime.toString().padStart(2, "0")}:00`;
  const dateStr = booking.date.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  
  await sendWhatsAppNotification({
    target: booking.userPhone,
    message: NOTIFICATION_TEMPLATES.BOOKING_CREATED({
      bookingCode: booking.id.slice(0, 8).toUpperCase(),
      courtName: booking.courtName,
      date: dateStr,
      time,
      paymentInstructions: "Transfer ke BCA 1234567890 a.n. BadmintonKu",
    }),
    type: "BOOKING_CREATED",
    referenceId: booking.id,
  });
}

export async function notifyPaymentSubmitted(booking: {
  id: string;
  userPhone: string;
  courtName: string;
  date: Date;
  startTime: number;
  endTime: number;
}) {
  const time = `${booking.startTime.toString().padStart(2, "0")}:00 – ${booking.endTime.toString().padStart(2, "0")}:00`;
  const dateStr = booking.date.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  
  await sendWhatsAppNotification({
    target: booking.userPhone,
    message: NOTIFICATION_TEMPLATES.PAYMENT_SUBMITTED({
      bookingCode: booking.id.slice(0, 8).toUpperCase(),
      courtName: booking.courtName,
      date: dateStr,
      time,
    }),
    type: "PAYMENT_SUBMITTED",
    referenceId: booking.id,
  });
}

export async function notifyPaymentApproved(booking: {
  id: string;
  userPhone: string;
  courtName: string;
  date: Date;
  startTime: number;
  endTime: number;
}) {
  const time = `${booking.startTime.toString().padStart(2, "0")}:00 – ${booking.endTime.toString().padStart(2, "0")}:00`;
  const dateStr = booking.date.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  
  await sendWhatsAppNotification({
    target: booking.userPhone,
    message: NOTIFICATION_TEMPLATES.PAYMENT_APPROVED({
      bookingCode: booking.id.slice(0, 8).toUpperCase(),
      courtName: booking.courtName,
      date: dateStr,
      time,
    }),
    type: "PAYMENT_APPROVED",
    referenceId: booking.id,
  });
}

export async function notifyPaymentRejected(booking: {
  id: string;
  userPhone: string;
  courtName: string;
  date: Date;
  startTime: number;
  endTime: number;
  reason: string;
}) {
  const time = `${booking.startTime.toString().padStart(2, "0")}:00 – ${booking.endTime.toString().padStart(2, "0")}:00`;
  const dateStr = booking.date.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  
  await sendWhatsAppNotification({
    target: booking.userPhone,
    message: NOTIFICATION_TEMPLATES.PAYMENT_REJECTED({
      bookingCode: booking.id.slice(0, 8).toUpperCase(),
      courtName: booking.courtName,
      date: dateStr,
      time,
      reason: booking.reason,
    }),
    type: "PAYMENT_REJECTED",
    referenceId: booking.id,
  });
}

export async function notifyBookingExpired(booking: {
  id: string;
  userPhone: string;
  courtName: string;
  date: Date;
  startTime: number;
  endTime: number;
}) {
  const time = `${booking.startTime.toString().padStart(2, "0")}:00 – ${booking.endTime.toString().padStart(2, "0")}:00`;
  const dateStr = booking.date.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  
  await sendWhatsAppNotification({
    target: booking.userPhone,
    message: NOTIFICATION_TEMPLATES.BOOKING_EXPIRED({
      bookingCode: booking.id.slice(0, 8).toUpperCase(),
      courtName: booking.courtName,
      date: dateStr,
      time,
    }),
    type: "BOOKING_EXPIRED",
    referenceId: booking.id,
  });
}