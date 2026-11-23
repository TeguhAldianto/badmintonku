import { describe, test, expect, beforeEach, vi } from "vitest";
import { BookingStatus, PaymentStatus } from "@prisma/client";
import { handleMidtransNotification } from "@/features/payment/server/midtrans.webhook";
import { createSnapToken } from "@/features/payment/server/midtrans.gateway";
import { prisma } from "@/server/db/prisma";

// Webhook integration tests opt into "signed" notifications. Signature math itself is
// covered without mocks in tests/midtrans-signature.test.ts.
vi.mock("@/features/payment/server/midtrans.gateway", async () => {
  const actual = await vi.importActual<
    typeof import("@/features/payment/server/midtrans.gateway")
  >("@/features/payment/server/midtrans.gateway");

  return {
    ...actual,
    verifySignature: vi.fn(() => true),
    createSnapToken: vi.fn(async () => "mock-snap-token-123"),
  };
});

function futureDateOnly(daysAhead = 30): Date {
  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return new Date(todayUtc + daysAhead * 24 * 60 * 60 * 1000);
}

describe("Midtrans Sandbox Integration Tests", () => {
  const testDate = futureDateOnly(30);
  const testUserPhone = "081298765432";
  let testBookingId: string;
  let testPaymentId: string;

  beforeEach(async () => {
    await prisma.payment.deleteMany({ where: { booking: { userPhone: testUserPhone } } });
    await prisma.booking.deleteMany({ where: { userPhone: testUserPhone } });

    const booking = await prisma.booking.create({
      data: {
        courtId: 1,
        date: testDate,
        startTime: 14,
        endTime: 15,
        userName: "Midtrans Test User",
        userPhone: testUserPhone,
        totalPrice: 50_000,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        status: BookingStatus.PENDING_PAYMENT,
        payment: { create: { amount: 50_000, status: PaymentStatus.UNPAID } },
      },
    });

    testBookingId = booking.id;
    const payment = await prisma.payment.findUnique({ where: { bookingId: booking.id } });
    testPaymentId = payment!.id;
  });

  test("1. Create Snap Token successfully", async () => {
    const booking = await prisma.booking.findUnique({ where: { id: testBookingId } });

    expect(booking?.status).toBe(BookingStatus.PENDING_PAYMENT);

    const token = await createSnapToken({
      id: testBookingId,
      totalPrice: Number(booking!.totalPrice),
      userName: booking!.userName,
      userPhone: booking!.userPhone,
    });

    expect(token).toBe("mock-snap-token-123");
  });

  test("2. Unknown order id is rejected", async () => {
    const result = await handleMidtransNotification({
      order_id: "non-existent-id",
      transaction_id: "tr-123",
      transaction_status: "settlement",
      gross_amount: "50000",
      payment_type: "credit_card",
      status_code: "200",
      currency: "IDR",
    });

    expect(result.success).toBe(false);
    expect(result.message).toBe("Payment not found");
  });

  test("3. Payment is linked to the expected booking owner", async () => {
    const payment = await prisma.payment.findUnique({
      where: { id: testPaymentId },
      include: { booking: true },
    });

    expect(payment?.booking.userPhone).toBe(testUserPhone);
  });

  test("4. Successful payment (settlement) confirms the booking", async () => {
    const txId = "midtrans-tx-success-1";
    const result = await handleMidtransNotification({
      order_id: testBookingId,
      transaction_id: txId,
      transaction_status: "settlement",
      gross_amount: "50000",
      payment_type: "qris",
      status_code: "200",
      currency: "IDR",
    });

    expect(result.success).toBe(true);

    const updatedPayment = await prisma.payment.findUnique({ where: { id: testPaymentId } });
    expect(updatedPayment?.status).toBe(PaymentStatus.PAID);
    expect(updatedPayment?.midtransTransactionId).toBe(txId);

    const updatedBooking = await prisma.booking.findUnique({ where: { id: testBookingId } });
    expect(updatedBooking?.status).toBe(BookingStatus.CONFIRMED);
  });

  test("5. Failed payment (deny) rejects payment and booking", async () => {
    const result = await handleMidtransNotification({
      order_id: testBookingId,
      transaction_id: "midtrans-tx-deny-1",
      transaction_status: "deny",
      gross_amount: "50000",
      payment_type: "credit_card",
      status_code: "202",
      currency: "IDR",
    });

    expect(result.success).toBe(true);

    const updatedPayment = await prisma.payment.findUnique({ where: { id: testPaymentId } });
    expect(updatedPayment?.status).toBe(PaymentStatus.REJECTED);

    const updatedBooking = await prisma.booking.findUnique({ where: { id: testBookingId } });
    expect(updatedBooking?.status).toBe(BookingStatus.REJECTED);
  });

  test("6. Expired payment (expire) expires the booking", async () => {
    const result = await handleMidtransNotification({
      order_id: testBookingId,
      transaction_id: "midtrans-tx-expire-1",
      transaction_status: "expire",
      gross_amount: "50000",
      payment_type: "bank_transfer",
      status_code: "202",
      currency: "IDR",
    });

    expect(result.success).toBe(true);

    const updatedPayment = await prisma.payment.findUnique({ where: { id: testPaymentId } });
    expect(updatedPayment?.status).toBe(PaymentStatus.REJECTED);

    const updatedBooking = await prisma.booking.findUnique({ where: { id: testBookingId } });
    expect(updatedBooking?.status).toBe(BookingStatus.EXPIRED);
  });

  test("7. Pending notification is recorded without changing the booking status", async () => {
    const result = await handleMidtransNotification({
      order_id: testBookingId,
      transaction_id: "midtrans-tx-pending-1",
      transaction_status: "pending",
      gross_amount: "50000",
      payment_type: "qris",
      status_code: "201",
      currency: "IDR",
    });

    expect(result.success).toBe(true);
    expect(result.message).toBe("Notification recorded");

    const updatedBooking = await prisma.booking.findUnique({ where: { id: testBookingId } });
    expect(updatedBooking?.status).toBe(BookingStatus.PENDING_PAYMENT);
  });

  test("8. Duplicate notification is idempotent", async () => {
    const txId = "midtrans-tx-dup-1";

    await handleMidtransNotification({
      order_id: testBookingId,
      transaction_id: txId,
      transaction_status: "settlement",
      gross_amount: "50000",
      payment_type: "qris",
      status_code: "200",
      currency: "IDR",
    });

    const result = await handleMidtransNotification({
      order_id: testBookingId,
      transaction_id: txId,
      transaction_status: "settlement",
      gross_amount: "50000",
      payment_type: "qris",
      status_code: "200",
      currency: "IDR",
    });

    expect(result.success).toBe(true);
    expect(result.message).toBe("Already processed");
  });

  test("9. Invalid notification data format is rejected", async () => {
    const result = await handleMidtransNotification({
      order_id: "",
      transaction_id: "",
      transaction_status: "unknown",
      gross_amount: "0",
      payment_type: "",
      status_code: "400",
      currency: "IDR",
    });

    expect(result.success).toBe(false);
  });

  test("10. Amount mismatch is rejected (no free confirmation)", async () => {
    const result = await handleMidtransNotification({
      order_id: testBookingId,
      transaction_id: "midtrans-tx-amount-mismatch",
      transaction_status: "settlement",
      gross_amount: "999999",
      payment_type: "qris",
      status_code: "200",
      currency: "IDR",
    });

    expect(result.success).toBe(false);
    expect(result.message).toBe("Payment amount mismatch");

    const updatedBooking = await prisma.booking.findUnique({ where: { id: testBookingId } });
    expect(updatedBooking?.status).toBe(BookingStatus.PENDING_PAYMENT);
  });

  test("11. Late settlement after expiry must not resurrect booking (and must not confirm)", async () => {
    await prisma.booking.update({
      where: { id: testBookingId },
      data: { expiresAt: new Date(Date.now() - 60 * 60 * 1000) },
    });

    const result = await handleMidtransNotification({
      order_id: testBookingId,
      transaction_id: "midtrans-tx-late-1",
      transaction_status: "settlement",
      gross_amount: "50000",
      payment_type: "qris",
      status_code: "200",
      currency: "IDR",
    });

    expect(result.success).toBe(true);

    const updatedBooking = await prisma.booking.findUnique({ where: { id: testBookingId } });
    const updatedPayment = await prisma.payment.findUnique({ where: { id: testPaymentId } });
    expect(updatedBooking?.status).not.toBe(BookingStatus.CONFIRMED);
    expect([BookingStatus.EXPIRED, BookingStatus.PENDING_PAYMENT, BookingStatus.REJECTED]).toContain(
      updatedBooking?.status
    );
    expect(updatedPayment?.status).toBe(PaymentStatus.REJECTED);
  });

  test("12. Settlement after a fraud challenge confirms the booking", async () => {
    const challenge = await handleMidtransNotification({
      order_id: testBookingId,
      transaction_id: "midtrans-tx-challenge-1",
      transaction_status: "capture",
      fraud_status: "challenge",
      gross_amount: "50000",
      payment_type: "credit_card",
      status_code: "201",
      currency: "IDR",
    });
    expect(challenge.success).toBe(true);

    const afterChallenge = await prisma.booking.findUnique({ where: { id: testBookingId } });
    expect(afterChallenge?.status).toBe(BookingStatus.WAITING_VERIFICATION);

    const settled = await handleMidtransNotification({
      order_id: testBookingId,
      transaction_id: "midtrans-tx-challenge-1",
      transaction_status: "settlement",
      gross_amount: "50000",
      payment_type: "credit_card",
      status_code: "200",
      currency: "IDR",
    });
    expect(settled.success).toBe(true);

    const booking = await prisma.booking.findUnique({ where: { id: testBookingId } });
    const payment = await prisma.payment.findUnique({ where: { id: testPaymentId } });
    expect(booking?.status).toBe(BookingStatus.CONFIRMED);
    expect(payment?.status).toBe(PaymentStatus.PAID);
  });
});
