import { BookingStatus, PaymentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
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
    // e.g. "pending": record the provider data without moving the booking state machine.
    await prisma.payment.update({ where: { id: payment.id }, data: midtransFields });
    return { success: true, message: "Notification recorded" };
  }

  // A completed booking must not be reopened by a late duplicate notification.
  const nextBookingStatus =
    payment.booking.status === BookingStatus.COMPLETED ? BookingStatus.COMPLETED : bookingStatus;

  const statusChanged =
    paymentStatus !== payment.status || nextBookingStatus !== payment.booking.status;

  if (!statusChanged) {
    await prisma.payment.update({ where: { id: payment.id }, data: midtransFields });
    return { success: true, message: "No status change" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        ...midtransFields,
        status: paymentStatus,
        rejectionReason: rejectionReason ?? payment.rejectionReason,
        verifiedAt: paymentStatus === PaymentStatus.PAID ? new Date() : payment.verifiedAt,
      },
    });

    await tx.booking.update({
      where: { id: payment.bookingId },
      data: {
        status: nextBookingStatus,
        statusHistory: {
          create: {
            oldStatus: payment.booking.status,
            newStatus: nextBookingStatus,
            changedBy: "MIDTRANS_WEBHOOK",
            notes: `Midtrans notification: ${payload.transaction_status}`,
          },
        },
      },
    });
  });

  const notification = {
    id: payment.bookingId,
    userPhone: payment.booking.userPhone,
    courtName: payment.booking.court.name,
    date: payment.booking.date,
    startTime: payment.booking.startTime,
    endTime: payment.booking.endTime,
  };

  try {
    if (paymentStatus === PaymentStatus.PAID && nextBookingStatus === BookingStatus.CONFIRMED) {
      await notifyPaymentApproved(notification);
    } else if (paymentStatus === PaymentStatus.REJECTED) {
      await notifyPaymentRejected({
        ...notification,
        reason: rejectionReason ?? `Pembayaran ${payload.transaction_status}`,
      });
    }
  } catch (err) {
    console.error("Notification failed (non-blocking):", err);
  }

  return { success: true, message: "Notification processed" };
}
