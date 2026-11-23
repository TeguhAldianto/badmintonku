import { describe, test, expect } from "vitest";
import { BookingStatus, PaymentStatus } from "@prisma/client";
import {
  createBooking,
  normalizePhone,
  updateBookingStatusByAdmin,
} from "@/features/booking/server/booking.service";
import { selectPaymentMethod } from "@/features/payment/server/payment.service";
import { prisma } from "@/server/db/prisma";

/** A UTC-midnight date `daysAhead` days in the future (never a hardcoded past date). */
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

describe("normalizePhone", () => {
  test("normalizes Indonesian phone formats to 08...", () => {
    expect(normalizePhone("08123456789")).toBe("08123456789");
    expect(normalizePhone("+628123456789")).toBe("08123456789");
    expect(normalizePhone("628123456789")).toBe("08123456789");
    expect(normalizePhone(" 0812-3456-789 ")).toBe("08123456789");
  });
});

describe("Booking Engine - Concurrency & Slot Blocking", () => {
  test("two simultaneous bookings for the same slot result in exactly one success", async () => {
    const testDate = futureDateOnly(7);
    const startTime = 10;
    const endTime = 11;

    await cleanup(testDate, startTime, endTime);

    const results = await Promise.allSettled([
      createBooking({
        courtId: COURT_ID,
        date: testDate,
        startTime,
        endTime,
        userName: "User A",
        userPhone: "08111111111",
      }),
      createBooking({
        courtId: COURT_ID,
        date: testDate,
        startTime,
        endTime,
        userName: "User B",
        userPhone: "08222222222",
      }),
    ]);

    const successes = results.filter((result) => result.status === "fulfilled");
    const failures = results.filter((result) => result.status === "rejected");

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);

    const rows = await prisma.booking.findMany({
      where: { courtId: COURT_ID, date: testDate, startTime, endTime },
    });
    expect(rows).toHaveLength(1);

    await cleanup(testDate, startTime, endTime);
  });

  test("a CONFIRMED booking blocks its slot even after the payment window has passed", async () => {
    const testDate = futureDateOnly(8);
    const startTime = 12;
    const endTime = 13;

    await cleanup(testDate, startTime, endTime);

    // Regression guard for the double-booking bug: expiresAt is in the past but the
    // booking is CONFIRMED, so the slot must stay occupied.
    await prisma.booking.create({
      data: {
        courtId: COURT_ID,
        date: testDate,
        startTime,
        endTime,
        userName: "Confirmed User",
        userPhone: "08133333333",
        totalPrice: 50_000,
        status: BookingStatus.CONFIRMED,
        expiresAt: new Date(Date.now() - 60 * 60 * 1000),
        payment: { create: { amount: 50_000, status: PaymentStatus.PAID } },
      },
    });

    await expect(
      createBooking({
        courtId: COURT_ID,
        date: testDate,
        startTime,
        endTime,
        userName: "Late User",
        userPhone: "08144444444",
      })
    ).rejects.toThrow("Slot telah dibooking oleh orang lain");

    await cleanup(testDate, startTime, endTime);
  });

  test("rejects a booking on a past date", async () => {
    await expect(
      createBooking({
        courtId: COURT_ID,
        date: new Date("2020-01-01T00:00:00.000Z"),
        startTime: 10,
        endTime: 11,
        userName: "Past User",
        userPhone: "08155555555",
      })
    ).rejects.toThrow("tanggal yang sudah lewat");
  });

  test("inline expiry of stale PENDING_PAYMENT records history and syncs payment", async () => {
    const testDate = futureDateOnly(10);
    const startTime = 14;
    const endTime = 15;
    await cleanup(testDate, startTime, endTime);

    const stale = await prisma.booking.create({
      data: {
        courtId: COURT_ID,
        date: testDate,
        startTime,
        endTime,
        userName: "Stale User",
        userPhone: "08166666666",
        totalPrice: 50_000,
        status: BookingStatus.PENDING_PAYMENT,
        expiresAt: new Date(Date.now() - 60 * 60 * 1000),
        payment: { create: { amount: 50_000, status: PaymentStatus.UNPAID } },
      },
    });

    await createBooking({
      courtId: COURT_ID,
      date: testDate,
      startTime,
      endTime,
      userName: "New User",
      userPhone: "08177777777",
    });

    const expired = await prisma.booking.findUnique({
      where: { id: stale.id },
      include: { payment: true, statusHistory: true },
    });
    expect(expired?.status).toBe(BookingStatus.EXPIRED);
    expect(expired?.payment?.status).toBe(PaymentStatus.REJECTED);
    expect(expired?.statusHistory.some((h) => h.newStatus === BookingStatus.EXPIRED)).toBe(true);

    await cleanup(testDate, startTime, endTime);
  });

  test("admin can confirm a DIRECT pay-at-venue booking", async () => {
    const testDate = futureDateOnly(12);
    const startTime = 16;
    const endTime = 17;
    await cleanup(testDate, startTime, endTime);

    const booking = await createBooking({
      courtId: COURT_ID,
      date: testDate,
      startTime,
      endTime,
      userName: "Direct User",
      userPhone: "08188888888",
    });

    await selectPaymentMethod({
      bookingId: booking.id,
      userPhone: "08188888888",
      method: "DIRECT",
    });

    const updated = await updateBookingStatusByAdmin(
      booking.id,
      BookingStatus.CONFIRMED,
      "admin-test"
    );
    expect(updated.status).toBe(BookingStatus.CONFIRMED);

    const payment = await prisma.payment.findUnique({ where: { bookingId: booking.id } });
    expect(payment?.status).toBe(PaymentStatus.PAID);
    expect(payment?.method).toBe("DIRECT");

    await cleanup(testDate, startTime, endTime);
  });
});
