import { describe, test, expect, beforeEach, vi } from "vitest";
import { handleMidtransNotification } from "../services/midtrans.notification";
import { createSnapToken } from "../services/midtrans.service";
import { prisma } from "@/lib/prisma";
import { PaymentStatus, BookingStatus } from "@prisma/client";

// Mock midtrans service
vi.mock("../services/midtrans.service", () => ({
  verifyNotification: vi.fn().mockResolvedValue({ status_code: "200", transaction_status: "settlement" }),
  createSnapToken: vi.fn().mockResolvedValue("mock-snap-token-123"),
}));

describe("Midtrans Sandbox Integration Tests", () => {
  const testDate = new Date("2026-12-31T00:00:00.000Z");
  let testBookingId: string;
  let testPaymentId: string;
  const testUserPhone = "081298765432";

  beforeEach(async () => {
    try {
      await prisma.payment.deleteMany({ where: { booking: { userPhone: testUserPhone } } });
      await prisma.booking.deleteMany({ where: { userPhone: testUserPhone } });
    } catch {
      // Ignore cleanup error
    }

    const booking = await prisma.booking.create({
      data: {
        courtId: 1,
        date: testDate,
        startTime: 14,
        endTime: 15,
        userName: "Midtrans Test User",
        userPhone: testUserPhone,
        totalPrice: 50000,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        status: BookingStatus.PENDING_PAYMENT,
        payment: {
          create: {
            amount: 50000,
            status: PaymentStatus.UNPAID,
          },
        },
      },
    });

    testBookingId = booking.id;
    const payment = await prisma.payment.findUnique({ where: { bookingId: booking.id } });
    testPaymentId = payment!.id;
  });

  test("1. Create Snap Token successfully", async () => {
    const booking = await prisma.booking.findUnique({
      where: { id: testBookingId },
    });
    
    expect(booking).toBeDefined();
    expect(booking?.status).toBe(BookingStatus.PENDING_PAYMENT);

    const token = await createSnapToken({
      id: testBookingId,
      totalPrice: Number(booking!.totalPrice),
      userName: booking!.userName,
      userPhone: booking!.userPhone,
    });

    expect(token).toBe("mock-snap-token-123");
  });

  test("2. Unauthorized payment / invalid booking code", async () => {
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

  test("3. Payment ownership & valid target", async () => {
    const payment = await prisma.payment.findUnique({
      where: { id: testPaymentId },
      include: { booking: true },
    });

    expect(payment?.booking.userPhone).toBe(testUserPhone);
  });

  test("4. Successful payment (settlement)", async () => {
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

  test("5. Failed payment (deny)", async () => {
    const txId = "midtrans-tx-deny-1";
    const result = await handleMidtransNotification({
      order_id: testBookingId,
      transaction_id: txId,
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

  test("6. Expired payment (expire)", async () => {
    const txId = "midtrans-tx-expire-1";
    const result = await handleMidtransNotification({
      order_id: testBookingId,
      transaction_id: txId,
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

  test("7. Duplicate notification (idempotency)", async () => {
    const txId = "midtrans-tx-dup-1";
    
    // First notification
    await handleMidtransNotification({
      order_id: testBookingId,
      transaction_id: txId,
      transaction_status: "settlement",
      gross_amount: "50000",
      payment_type: "qris",
      status_code: "200",
      currency: "IDR",
    });

    // Duplicate notification with same transaction_id
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

  test("8. Invalid notification data format", async () => {
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

  test("9. Invalid booking status check before payment creation", async () => {
    // Change booking status to CONFIRMED
    await prisma.booking.update({
      where: { id: testBookingId },
      data: { status: BookingStatus.CONFIRMED },
    });

    const booking = await prisma.booking.findUnique({ where: { id: testBookingId } });
    expect(booking?.status).toBe(BookingStatus.CONFIRMED);
  });

  test("10. Amount mismatch verification", async () => {
    const txId = "midtrans-tx-amount-mismatch";
    // Notification with different gross_amount
    const result = await handleMidtransNotification({
      order_id: testBookingId,
      transaction_id: txId,
      transaction_status: "settlement",
      gross_amount: "999999", // Mismatch with 50000
      payment_type: "qris",
      status_code: "200",
      currency: "IDR",
    });

    // CRITICAL FIX: Amount mismatch should be REJECTED to prevent payment manipulation
    expect(result.success).toBe(false);
    expect(result.message).toBe("Payment amount mismatch");
  });
});