import { describe, expect, test } from "vitest";
import { BookingStatus, PaymentStatus } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { createBooking } from "@/features/booking/server/booking.service";
import { applyMidtransNotification } from "@/features/payment/server/midtrans.webhook";
import { createLookupOtp, verifyLookupOtp } from "@/features/booking/server/lookup-otp";

function futureDateOnly(daysAhead = 7): Date {
  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return new Date(todayUtc + daysAhead * 24 * 60 * 60 * 1000);
}

const COURT_ID = 1;

async function cleanup(date: Date, startTime: number, endTime: number) {
  await prisma.payment.deleteMany({
    where: { booking: { courtId: COURT_ID, date, startTime, endTime } },
  });
  await prisma.booking.deleteMany({ where: { courtId: COURT_ID, date, startTime, endTime } });
}

describe("lookup OTP", () => {
  test("verifies a valid code and rejects reuse", async () => {
    const phone = "081299990001";
    const code = await createLookupOtp(phone);
    expect(code).toMatch(/^\d{6}$/);
    expect(await verifyLookupOtp(phone, code!)).toBe(true);
    expect(await verifyLookupOtp(phone, code!)).toBe(false);
  });

  test("rejects wrong code but allows correct code afterwards", async () => {
    const phone = "081299990002";
    const code = await createLookupOtp(phone);
    expect(code).toMatch(/^\d{6}$/);
    expect(await verifyLookupOtp(phone, "000000")).toBe(false);
    expect(await verifyLookupOtp(phone, code!)).toBe(true);
  });
});

describe("midtrans webhook guards", () => {
  test("late settlement does not confirm an expired unpaid booking", async () => {
    const testDate = futureDateOnly(15);
    const startTime = 8;
    const endTime = 9;
    await cleanup(testDate, startTime, endTime);

    const booking = await createBooking({
      courtId: COURT_ID,
      date: testDate,
      startTime,
      endTime,
      userName: "Expire User",
      userPhone: "081299990003",
    });

    await prisma.booking.update({
      where: { id: booking.id },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });

    const result = await applyMidtransNotification({
      order_id: booking.id,
      transaction_id: "tx-expire-1",
      status_code: "200",
      gross_amount: "50000.00",
      signature_key: "test",
      payment_type: "qris",
      transaction_status: "settlement",
      fraud_status: "accept",
      currency: "IDR",
    });

    expect(result.success).toBe(true);
    const fresh = await prisma.booking.findUnique({
      where: { id: booking.id },
      include: { payment: true },
    });
    expect(fresh?.status).not.toBe(BookingStatus.CONFIRMED);
    expect(fresh?.payment?.status).not.toBe(PaymentStatus.PAID);

    await cleanup(testDate, startTime, endTime);
  });
});
