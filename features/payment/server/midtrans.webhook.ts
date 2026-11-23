import { BookingStatus, PaymentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { isActiveBlockingBooking } from "@/features/booking/server/booking.service";
import {
  verifySignature,
  type MidtransNotificationPayload,
} from "@/features/payment/server/midtrans.gateway";
import {
  notifyPaymentApproved,
  notifyPaymentRejected,
} from "@/features/notification/server/notification.service";

export interface MidtransWebhookResult {
  success: boolean;
  message: string;
}

function resolveTransition(payload: MidtransNotificationPayload): {
  paymentStatus?: PaymentStatus;
  bookingStatus?: BookingStatus;
  rejectionReason?: string;
} {
  const { transaction_status, fraud_status } = payload;

  switch (transaction_status) {
    case "capture":
      if (fraud_status === "challenge") {
        return {
          paymentStatus: PaymentStatus.VERIFYING,
          bookingStatus: BookingStatus.WAITING_VERIFICATION,
        };
      }
      return { paymentStatus: PaymentStatus.PAID, bookingStatus: BookingStatus.CONFIRMED };
    case "settlement":
      return { paymentStatus: PaymentStatus.PAID, bookingStatus: BookingStatus.CONFIRMED };
    case "pending":
      // Midtrans "pending" means the user has not paid yet: keep our state untouched.
      return {};
    case "deny":
      return {
        paymentStatus: PaymentStatus.REJECTED,
        bookingStatus: BookingStatus.REJECTED,
        rejectionReason: `Pembayaran ditolak oleh Midtrans (${transaction_status})`,
      };
    case "expire":
      return {
        paymentStatus: PaymentStatus.REJECTED,
        bookingStatus: BookingStatus.EXPIRED,
        rejectionReason: `Pembayaran kadaluarsa (${transaction_status})`,
      };
    case "cancel":
      return {
        paymentStatus: PaymentStatus.REJECTED,
        bookingStatus: BookingStatus.CANCELLED,
        rejectionReason: `Pembayaran dibatalkan (${transaction_status})`,
      };
    default:
      return {};
  }
}

export async function handleMidtransNotification(
  payload: MidtransNotificationPayload
): Promise<MidtransWebhookResult> {
  // Never trust an unsigned webhook: a forged "settlement" could confirm a booking for free.
  if (!verifySignature(payload)) {
    console.error("Midtrans notification rejected: invalid signature", { order_id: payload.order_id });
    return { success: false, message: "Invalid signature" };
  }

  return applyMidtransNotification(payload);
}

/**
 * Applies a Midtrans transaction status to the local payment/booking state machine.
 * Called by the webhook (signature already verified) and by the server-side status
 * sync, which reads the same fields from the Midtrans status API.
 */
const TERMINAL_BOOKING_STATUSES = new Set<BookingStatus>([
  BookingStatus.COMPLETED,
  BookingStatus.CANCELLED,
  BookingStatus.REJECTED,
  BookingStatus.EXPIRED,
]);

export async function applyMidtransNotification(
  payload: MidtransNotificationPayload
): Promise<MidtransWebhookResult> {
  const { order_id, transaction_id, gross_amount, payment_type, fraud_status, status_code, currency } =
    payload;

  if (!order_id) return { success: false, message: "Payment not found" };

  const payment = await prisma.payment.findFirst({
    where: { bookingId: order_id },
    include: { booking: { include: { court: true } } },
  });

  if (!payment) {
    console.error(`Payment not found for order_id: ${order_id}`);
    return { success: false, message: "Payment not found" };
  }

  const expectedAmount = Number(payment.booking.totalPrice);
  const receivedAmount = Number.parseFloat(gross_amount);
  if (!Number.isFinite(receivedAmount) || Math.round(receivedAmount) !== Math.round(expectedAmount)) {
    console.error(
      `Payment amount mismatch: expected ${expectedAmount}, received ${receivedAmount} for order_id: ${order_id}`
    );
    return { success: false, message: "Payment amount mismatch" };
  }

  const isDuplicate =
    payment.midtransTransactionId === transaction_id &&
    (payment.status === PaymentStatus.PAID || payment.status === PaymentStatus.REJECTED);

  if (isDuplicate) {
    return { success: true, message: "Already processed" };
  }

  const { paymentStatus, bookingStatus, rejectionReason } = resolveTransition(payload);

  const midtransFields: Prisma.PaymentUpdateInput = {
    midtransTransactionId: transaction_id,
    midtransPaymentType: payment_type,
    midtransOrderId: order_id,
    midtransFraudStatus: fraud_status ?? null,
    midtransStatusCode: status_code,
    midtransGrossAmount: receivedAmount,
    midtransCurrency: currency,
    midtransRawResponse: JSON.stringify(payload),
  };

  if (!paymentStatus || !bookingStatus) {
    await prisma.payment.update({ where: { id: payment.id }, data: midtransFields });
    return { success: true, message: "Notification recorded" };
  }

  // Never reopen a terminal booking or resurrect an expired slot via late/out-of-order events.
  if (
    TERMINAL_BOOKING_STATUSES.has(payment.booking.status) &&
    payment.booking.status !== bookingStatus
  ) {
    await prisma.payment.update({ where: { id: payment.id }, data: midtransFields });
    return { success: true, message: "Ignored: booking already in terminal state" };
  }

  const finalPaymentStatus = paymentStatus;
  const finalBookingStatus = bookingStatus;
  const finalReason = rejectionReason;

  if (finalBookingStatus === BookingStatus.CONFIRMED) {
    const result = await prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT id FROM courts WHERE id = ${payment.booking.courtId} FOR UPDATE`;

        const current = await tx.booking.findUnique({
          where: { id: payment.bookingId },
          select: { status: true, expiresAt: true, courtId: true, date: true, startTime: true, endTime: true },
        });
        if (!current) return { applied: false, message: "Payment not found" as const };

        if (TERMINAL_BOOKING_STATUSES.has(current.status)) {
          await tx.payment.update({ where: { id: payment.id }, data: midtransFields });
          return { applied: false, message: "Ignored: booking already in terminal state" as const };
        }
        if (current.status === BookingStatus.CONFIRMED) {
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              ...midtransFields,
              status: PaymentStatus.PAID,
              verifiedAt: payment.verifiedAt ?? new Date(),
            },
          });
          return { applied: true, confirmed: true, statusChanged: payment.status !== PaymentStatus.PAID } as const;
        }
        // Only an unpaid window can expire. WAITING_VERIFICATION already holds the slot
        // (e.g. fraud challenge), so a later settlement must confirm it.
        if (
          current.status === BookingStatus.PENDING_PAYMENT &&
          current.expiresAt.getTime() < Date.now()
        ) {
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              ...midtransFields,
              status: PaymentStatus.REJECTED,
              rejectionReason: "Pembayaran terlambat melewati batas waktu",
            },
          });
          if (current.status === BookingStatus.PENDING_PAYMENT) {
            await tx.booking.update({
              where: { id: payment.bookingId },
              data: {
                status: BookingStatus.EXPIRED,
                statusHistory: {
                  create: {
                    oldStatus: current.status,
                    newStatus: BookingStatus.EXPIRED,
                    changedBy: "MIDTRANS_WEBHOOK",
                    notes: "Pembayaran terlambat melewati batas waktu",
                  },
                },
              },
            });
          }
          return { applied: true, confirmed: false, rejectedLate: true } as const;
        }

        const overlaps = await tx.booking.findMany({
          where: {
            id: { not: payment.bookingId },
            courtId: current.courtId,
            date: current.date,
            AND: [{ startTime: { lt: current.endTime } }, { endTime: { gt: current.startTime } }],
          },
          select: { id: true, status: true, expiresAt: true },
        });
        if (overlaps.some((b) => isActiveBlockingBooking(b))) {
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              ...midtransFields,
              status: PaymentStatus.REJECTED,
              rejectionReason: "Slot sudah tidak tersedia (terisi booking lain)",
            },
          });
          await tx.booking.update({
            where: { id: payment.bookingId },
            data: {
              status: BookingStatus.REJECTED,
              statusHistory: {
                create: {
                  oldStatus: current.status,
                  newStatus: BookingStatus.REJECTED,
                  changedBy: "MIDTRANS_WEBHOOK",
                  notes: "Slot sudah tidak tersedia saat pembayaran dikonfirmasi",
                },
              },
            },
          });
          return { applied: true, confirmed: false, conflict: true } as const;
        }

        await tx.payment.update({
          where: { id: payment.id },
          data: {
            ...midtransFields,
            status: PaymentStatus.PAID,
            rejectionReason: null,
            verifiedAt: new Date(),
          },
        });
        await tx.booking.update({
          where: { id: payment.bookingId },
          data: {
            status: BookingStatus.CONFIRMED,
            statusHistory: {
              create: {
                oldStatus: current.status,
                newStatus: BookingStatus.CONFIRMED,
                changedBy: "MIDTRANS_WEBHOOK",
                notes: `Midtrans notification: ${payload.transaction_status}`,
              },
            },
          },
        });
        return { applied: true, confirmed: true, statusChanged: true } as const;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    if (result.applied && result.confirmed && result.statusChanged) {
      try {
        await notifyPaymentApproved({
          id: payment.bookingId,
          userPhone: payment.booking.userPhone,
          courtName: payment.booking.court.name,
          date: payment.booking.date,
          startTime: payment.booking.startTime,
          endTime: payment.booking.endTime,
        });
      } catch (err) {
        console.error("Notification failed (non-blocking):", err);
      }
      return { success: true, message: "Notification processed" };
    }

    if (result.applied && !result.confirmed) {
      try {
        await notifyPaymentRejected({
          id: payment.bookingId,
          userPhone: payment.booking.userPhone,
          courtName: payment.booking.court.name,
          date: payment.booking.date,
          startTime: payment.booking.startTime,
          endTime: payment.booking.endTime,
          reason: "conflict" in result && result.conflict
            ? "Slot sudah tidak tersedia (terisi booking lain)"
            : "Pembayaran terlambat melewati batas waktu",
        });
      } catch (err) {
        console.error("Notification failed (non-blocking):", err);
      }
      return { success: true, message: "Notification processed" };
    }

    return { success: true, message: result.message ?? "No status change" };
  }

  const statusChanged =
    finalPaymentStatus !== payment.status || finalBookingStatus !== payment.booking.status;

  if (!statusChanged) {
    await prisma.payment.update({ where: { id: payment.id }, data: midtransFields });
    return { success: true, message: "No status change" };
  }

  const applied = await prisma.$transaction(async (tx) => {
    const paymentResult = await tx.payment.updateMany({
      where: { id: payment.id, status: { in: [PaymentStatus.UNPAID, PaymentStatus.VERIFYING] } },
      data: {
        ...midtransFields,
        status: finalPaymentStatus,
        rejectionReason: finalReason ?? payment.rejectionReason,
        verifiedAt: finalPaymentStatus === PaymentStatus.PAID ? new Date() : payment.verifiedAt,
      },
    });

    const bookingResult = await tx.booking.updateMany({
      where: { id: payment.bookingId, status: payment.booking.status },
      data: { status: finalBookingStatus },
    });

    if (bookingResult.count > 0) {
      await tx.bookingStatusHistory.create({
        data: {
          bookingId: payment.bookingId,
          oldStatus: payment.booking.status,
          newStatus: finalBookingStatus,
          changedBy: "MIDTRANS_WEBHOOK",
          notes: `Midtrans notification: ${payload.transaction_status}`,
        },
      });
    }

    // If state guards blocked the transition, persist Midtrans metadata for audit only.
    if (paymentResult.count === 0 || bookingResult.count === 0) {
      await tx.payment.update({ where: { id: payment.id }, data: midtransFields });
    }

    return { paymentChanged: paymentResult.count > 0, bookingChanged: bookingResult.count > 0 };
  });

  if (!applied.paymentChanged && !applied.bookingChanged) {
    return { success: true, message: "No status change" };
  }

  const notification = {
    id: payment.bookingId,
    userPhone: payment.booking.userPhone,
    courtName: payment.booking.court.name,
    date: payment.booking.date,
    startTime: payment.booking.startTime,
    endTime: payment.booking.endTime,
  };

  try {
    if (finalBookingStatus === BookingStatus.WAITING_VERIFICATION) {
      // Challenge/pending-verification: no user-facing approval/rejection notification needed here.
    } else if (finalPaymentStatus === PaymentStatus.REJECTED) {
      await notifyPaymentRejected({
        ...notification,
        reason: finalReason ?? `Pembayaran ${payload.transaction_status}`,
      });
    }
  } catch (err) {
    console.error("Notification failed (non-blocking):", err);
  }

  return { success: true, message: "Notification processed" };
}
