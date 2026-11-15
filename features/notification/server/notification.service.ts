import { prisma } from "@/server/db/prisma";
import { formatDateIndo } from "@/shared/lib/format";
import { NOTIFICATION_TEMPLATES, type NotificationType } from "@/features/notification/server/templates";

export { NOTIFICATION_TEMPLATES };

const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || "https://api.fonnte.com/send";

export interface NotificationPayload {
  target: string;
  message: string;
  type: NotificationType;
  referenceId: string;
}

export interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
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
    await prisma.notificationLog.create({ data });
  } catch (logError) {
    console.error("Failed to log notification:", logError);
  }
}

export async function sendWhatsAppNotification(payload: NotificationPayload): Promise<NotificationResult> {
  const apiKey = process.env.WHATSAPP_API_KEY || process.env.FONNTE_API_KEY;

  if (!apiKey) {
    return { success: false, error: "WhatsApp API key not configured" };
  }

  try {
    const response = await fetch(WHATSAPP_API_URL, {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        target: payload.target,
        message: payload.message,
        countryCode: "62",
      }),
    });

    const data = (await response.json()) as { status?: boolean; messageId?: string; reason?: string };

    if (response.ok && data.status === true) {
      await logNotification({
        ...payload,
        status: "SENT",
        providerResponse: JSON.stringify(data),
      });
      return { success: true, messageId: data.messageId };
    }

    const errorMsg = data.reason || "Unknown Fonnte error";
    await logNotification({
      ...payload,
      status: "FAILED",
      errorMessage: errorMsg,
      providerResponse: JSON.stringify(data),
    });
    return { success: false, error: errorMsg };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Network error";
    await logNotification({ ...payload, status: "ERROR", errorMessage: errorMsg });
    return { success: false, error: errorMsg };
  }
}

/** Re-sends notifications that previously failed. Safe to call from cron. */
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
        type: notification.type as NotificationType,
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

interface BookingNotificationBase {
  id: string;
  userPhone: string;
  courtName: string;
  date: Date;
  startTime: number;
  endTime: number;
}

function bookingContext(booking: BookingNotificationBase) {
  return {
    bookingCode: booking.id.slice(0, 8).toUpperCase(),
    courtName: booking.courtName,
    date: formatDateIndo(booking.date),
    time: `${booking.startTime.toString().padStart(2, "0")}:00 – ${booking.endTime
      .toString()
      .padStart(2, "0")}:00`,
  };
}

export async function notifyBookingCreated(
  booking: BookingNotificationBase & { userName: string; paymentInstructions?: string }
) {
  await sendWhatsAppNotification({
    target: booking.userPhone,
    message: NOTIFICATION_TEMPLATES.BOOKING_CREATED({
      ...bookingContext(booking),
      paymentInstructions: booking.paymentInstructions ?? "Transfer ke BCA 1234567890 a.n. BadmintonKu",
    }),
    type: "BOOKING_CREATED",
    referenceId: booking.id,
  });
}

export async function notifyPaymentSubmitted(booking: BookingNotificationBase) {
  await sendWhatsAppNotification({
    target: booking.userPhone,
    message: NOTIFICATION_TEMPLATES.PAYMENT_SUBMITTED(bookingContext(booking)),
    type: "PAYMENT_SUBMITTED",
    referenceId: booking.id,
  });
}

export async function notifyPaymentApproved(booking: BookingNotificationBase) {
  await sendWhatsAppNotification({
    target: booking.userPhone,
    message: NOTIFICATION_TEMPLATES.PAYMENT_APPROVED(bookingContext(booking)),
    type: "PAYMENT_APPROVED",
    referenceId: booking.id,
  });
}

export async function notifyPaymentRejected(booking: BookingNotificationBase & { reason: string }) {
  await sendWhatsAppNotification({
    target: booking.userPhone,
    message: NOTIFICATION_TEMPLATES.PAYMENT_REJECTED({ ...bookingContext(booking), reason: booking.reason }),
    type: "PAYMENT_REJECTED",
    referenceId: booking.id,
  });
}

export async function notifyBookingExpired(booking: BookingNotificationBase) {
  await sendWhatsAppNotification({
    target: booking.userPhone,
    message: NOTIFICATION_TEMPLATES.BOOKING_EXPIRED(bookingContext(booking)),
    type: "BOOKING_EXPIRED",
    referenceId: booking.id,
  });
}
