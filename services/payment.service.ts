import { prisma } from "@/lib/prisma";
import { PaymentStatus, BookingStatus } from "@prisma/client";
import { notifyPaymentSubmitted, notifyPaymentApproved, notifyPaymentRejected } from "@/services/notification.service";

export const PAYMENT_METHODS = ["DIRECT", "BANK_TRANSFER", "QRIS"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATE = {
  PENDING: PaymentStatus.UNPAID,
  WAITING_VERIFICATION: PaymentStatus.VERIFYING,
  PAID: PaymentStatus.PAID,
  REJECTED: PaymentStatus.REJECTED,
} as const;

export const VALID_USER_UPLOAD_TRANSITIONS: PaymentStatus[] = [
  PaymentStatus.UNPAID,
];

export const VALID_ADMIN_TRANSITIONS = {
  [PaymentStatus.VERIFYING]: [PaymentStatus.PAID, PaymentStatus.REJECTED],
  [PaymentStatus.REJECTED]: [PaymentStatus.VERIFYING],
} as const;

export const PAYMENT_INSTRUCTIONS: Record<PaymentMethod, string> = {
  DIRECT: "Bayar langsung ke admin saat check-in",
  BANK_TRANSFER: "Transfer ke BCA 1234567890 a.n. BadmintonKu",
  QRIS: "Scan QRIS yang tersedia di halaman pembayaran",
};

export const MAX_FILE_SIZE = 2 * 1024 * 1024;
export const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

export interface PaymentProofUpload {
  bookingId: string;
  userPhone: string;
  file: Buffer;
  mimeType: string;
  method: PaymentMethod;
}

export async function uploadPaymentProof({
  bookingId,
  userPhone,
  file,
  mimeType,
  method,
}: PaymentProofUpload) {
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new Error("Format file tidak didukung. Gunakan JPG, PNG, atau WebP.");
  }
  if (file.length > MAX_FILE_SIZE) {
    throw new Error("Ukuran file maksimal 2MB.");
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { payment: true, court: true },
  });

  if (!booking) throw new Error("Booking tidak ditemukan");
  if (booking.userPhone !== userPhone) throw new Error("Tidak memiliki akses ke booking ini");

  const payment = booking.payment;
  if (!payment) throw new Error("Data pembayaran tidak ditemukan");

  if (!VALID_USER_UPLOAD_TRANSITIONS.includes(payment.status)) {
    throw new Error(`Tidak dapat upload bukti pada status ${payment.status}`);
  }

  const updatedPayment = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      proofUrl: `/uploads/${bookingId}-${Date.now()}.${mimeType.split("/")[1]}`,
      status: PaymentStatus.VERIFYING,
      method,
    },
  });

  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: BookingStatus.WAITING_VERIFICATION,
      statusHistory: {
        create: {
          oldStatus: BookingStatus.PENDING_PAYMENT,
          newStatus: BookingStatus.WAITING_VERIFICATION,
          changedBy: "USER",
          notes: `Upload bukti pembayaran via ${method}`,
        },
      },
    },
  });

  // Trigger Notification (Async, non-blocking)
  try {
    await notifyPaymentSubmitted({
      id: bookingId,
      userPhone: booking.userPhone,
      courtName: booking.court.name,
      date: booking.date,
      startTime: booking.startTime,
      endTime: booking.endTime,
    });
  } catch (err) {
    console.error("Payment submitted notification failed:", err);
  }

  return updatedPayment;
}

export interface AdminPaymentAction {
  paymentId: string;
  action: "APPROVE" | "REJECT";
  adminId: string;
  rejectionReason?: string;
}

export async function processPaymentAdmin({ paymentId, action, adminId, rejectionReason }: AdminPaymentAction) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { booking: { include: { court: true } } },
  });

  if (!payment) throw new Error("Pembayaran tidak ditemukan");

  if (payment.status !== PaymentStatus.VERIFYING) {
    throw new Error(`Pembayaran tidak dalam status menunggu verifikasi (current: ${payment.status})`);
  }

  if (action === "APPROVE") {
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.PAID,
          verifiedAt: new Date(),
        },
      });

      await tx.booking.update({
        where: { id: payment.bookingId },
        data: {
          status: BookingStatus.CONFIRMED,
          statusHistory: {
            create: {
              oldStatus: BookingStatus.WAITING_VERIFICATION,
              newStatus: BookingStatus.CONFIRMED,
              changedBy: adminId,
              notes: "Pembayaran diverifikasi oleh admin",
            },
          },
        },
      });
    });

    // Fetch updated booking for notification
    const updatedBooking = await prisma.booking.findUnique({
      where: { id: payment.bookingId },
      include: { court: true },
    });

    // Trigger Notification (Async, non-blocking)
    if (updatedBooking) {
      try {
        await notifyPaymentApproved({
          id: updatedBooking.id,
          userPhone: updatedBooking.userPhone,
          courtName: updatedBooking.court.name,
          date: updatedBooking.date,
          startTime: updatedBooking.startTime,
          endTime: updatedBooking.endTime,
        });
      } catch (err) {
        console.error("Payment approved notification failed:", err);
      }
    }

    return { success: true };
  } else {
    if (!rejectionReason) throw new Error("Alasan penolakan wajib diisi");

    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.REJECTED,
          rejectionReason,
        },
      });

      await tx.booking.update({
        where: { id: payment.bookingId },
        data: {
          status: BookingStatus.REJECTED,
          statusHistory: {
            create: {
              oldStatus: BookingStatus.WAITING_VERIFICATION,
              newStatus: BookingStatus.REJECTED,
              changedBy: adminId,
              notes: `Pembayaran ditolak: ${rejectionReason}`,
            },
          },
        },
      });
    });

    // Fetch updated booking for notification
    const updatedBooking = await prisma.booking.findUnique({
      where: { id: payment.bookingId },
      include: { court: true },
    });

    // Trigger Notification (Async, non-blocking)
    if (updatedBooking) {
      try {
        await notifyPaymentRejected({
          id: updatedBooking.id,
          userPhone: updatedBooking.userPhone,
          courtName: updatedBooking.court.name,
          date: updatedBooking.date,
          startTime: updatedBooking.startTime,
          endTime: updatedBooking.endTime,
          reason: rejectionReason,
        });
      } catch (err) {
        console.error("Payment rejected notification failed:", err);
      }
    }

    return { success: true };
  }
}

export async function getPaymentWithProof(paymentId: string, userPhone?: string, isAdmin = false) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      booking: {
        include: { court: true },
      },
    },
  });

  if (!payment) throw new Error("Pembayaran tidak ditemukan");

  if (!isAdmin && payment.booking.userPhone !== userPhone) {
    throw new Error("Tidak memiliki akses");
  }

  return payment;
}