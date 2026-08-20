import { prisma } from "@/lib/prisma";
import { PaymentStatus, BookingStatus } from "@prisma/client";
import { verifyNotification } from "@/services/midtrans.service";
import { notifyPaymentApproved, notifyPaymentRejected } from "@/services/notification.service";

export interface MidtransNotification {
  transaction_status: string;
  transaction_id: string;
  order_id: string;
  gross_amount: string;
  payment_type: string;
  fraud_status?: string;
  status_code: string;
  currency: string;
}

export async function handleMidtransNotification(notification: MidtransNotification) {
  const { order_id, transaction_id, transaction_status, gross_amount, payment_type, fraud_status, status_code, currency } = notification;

  // Find payment by order_id (booking ID)
  const payment = await prisma.payment.findFirst({
    where: {
      bookingId: order_id,
    },
    include: {
      booking: {
        include: {
          court: true,
        },
      },
    },
  });

  if (!payment) {
    console.error(`Payment not found for order_id: ${order_id}`);
    return { success: false, message: "Payment not found" };
  }

  // Check idempotency - if already processed this transaction
  if (payment.midtransTransactionId === transaction_id && payment.status !== PaymentStatus.UNPAID) {
    console.log(`Notification already processed for transaction: ${transaction_id}`);
    return { success: true, message: "Already processed" };
  }

  // Verify the notification signature with Midtrans
  try {
    const verified = await verifyNotification(notification as unknown as Record<string, unknown>);
    console.log("Midtrans notification verified:", verified);
  } catch (error) {
    console.error("Failed to verify Midtrans notification:", error);
    // Still process but log the error
  }

  // CRITICAL: Verify gross_amount matches booking totalPrice to prevent payment manipulation
  const expectedAmount = Number(payment.booking.totalPrice);
  const receivedAmount = parseFloat(gross_amount);
  if (receivedAmount !== expectedAmount) {
    console.error(`Payment amount mismatch: expected ${expectedAmount}, received ${receivedAmount} for order_id: ${order_id}`);
    return { success: false, message: "Payment amount mismatch" };
  }

  // Determine new payment status based on Midtrans status
  let newPaymentStatus: PaymentStatus = payment.status;
  let newBookingStatus: BookingStatus = payment.booking.status;

  switch (transaction_status) {
    case "capture":
      if (fraud_status === "challenge") {
        newPaymentStatus = PaymentStatus.VERIFYING;
        newBookingStatus = BookingStatus.WAITING_VERIFICATION;
      } else if (fraud_status === "accept") {
        newPaymentStatus = PaymentStatus.PAID;
        newBookingStatus = BookingStatus.CONFIRMED;
      }
      break;
    case "settlement":
      newPaymentStatus = PaymentStatus.PAID;
      newBookingStatus = BookingStatus.CONFIRMED;
      break;
    case "pending":
      newPaymentStatus = PaymentStatus.VERIFYING;
      newBookingStatus = BookingStatus.WAITING_VERIFICATION;
      break;
    case "deny":
      newPaymentStatus = PaymentStatus.REJECTED;
      newBookingStatus = BookingStatus.REJECTED;
      break;
    case "expire":
      newPaymentStatus = PaymentStatus.REJECTED;
      newBookingStatus = BookingStatus.EXPIRED;
      break;
    case "cancel":
      newPaymentStatus = PaymentStatus.REJECTED;
      newBookingStatus = BookingStatus.CANCELLED;
      break;
    default:
      console.log(`Unhandled transaction status: ${transaction_status}`);
  }

  // Only update if status changed
  if (newPaymentStatus !== payment.status || newBookingStatus !== payment.booking.status) {
    await prisma.$transaction(async (tx) => {
      // Update payment with Midtrans data
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: newPaymentStatus,
          midtransTransactionId: transaction_id,
          midtransPaymentType: payment_type,
          midtransOrderId: order_id,
          midtransFraudStatus: fraud_status,
          midtransStatusCode: status_code,
          midtransGrossAmount: parseFloat(gross_amount),
          midtransCurrency: currency,
          midtransRawResponse: JSON.stringify(notification),
          verifiedAt: newPaymentStatus === PaymentStatus.PAID ? new Date() : payment.verifiedAt,
        },
      });

      // Update booking status
      await tx.booking.update({
        where: { id: payment.bookingId },
        data: {
          status: newBookingStatus,
          statusHistory: {
            create: {
              oldStatus: payment.booking.status,
              newStatus: newBookingStatus,
              changedBy: "MIDTRANS_WEBHOOK",
              notes: `Midtrans notification: ${transaction_status}`,
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

    // Send WhatsApp notification (async, non-blocking)
    if (updatedBooking) {
      try {
        if (newPaymentStatus === PaymentStatus.PAID && newBookingStatus === BookingStatus.CONFIRMED) {
          await notifyPaymentApproved({
            id: updatedBooking.id,
            userPhone: updatedBooking.userPhone,
            courtName: updatedBooking.court.name,
            date: updatedBooking.date,
            startTime: updatedBooking.startTime,
            endTime: updatedBooking.endTime,
          });
        } else if (newPaymentStatus === PaymentStatus.REJECTED) {
          await notifyPaymentRejected({
            id: updatedBooking.id,
            userPhone: updatedBooking.userPhone,
            courtName: updatedBooking.court.name,
            date: updatedBooking.date,
            startTime: updatedBooking.startTime,
            endTime: updatedBooking.endTime,
            reason: `Pembayaran ${transaction_status}: ${fraud_status || status_code}`,
          });
        }
      } catch (err) {
        console.error("Notification failed (non-blocking):", err);
      }
    }
  }

  return { success: true };
}