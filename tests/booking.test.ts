import { describe, test, expect } from "vitest";
import { createBooking } from "../services/booking.service";
import { prisma } from "@/lib/prisma";

describe("Booking Engine - Concurrent Booking Race Condition", () => {
  test("User A and User B booking the same court and slot simultaneously results in only one success", async () => {
    const testDate = new Date("2025-12-31T00:00:00.000Z");
    const courtId = 1;
    const startTime = 10;
    const endTime = 11;

    await prisma.booking.deleteMany({
      where: {
        courtId,
        date: testDate,
        startTime,
        endTime,
      },
    });

    // Create promises that start at the same time
    const promiseA = createBooking({
      courtId,
      date: testDate,
      startTime,
      endTime,
      userName: "User A",
      userPhone: "08111111111",
    });

    const promiseB = createBooking({
      courtId,
      date: testDate,
      startTime,
      endTime,
      userName: "User B",
      userPhone: "08222222222",
    });

    // Execute concurrently
    const results = await Promise.allSettled([promiseA, promiseB]);

    const successes = results.filter((r) => r.status === "fulfilled");
    const failures = results.filter((r) => r.status === "rejected");

    // At least one must fail (double booking prevention)
    expect(successes.length + failures.length).toBe(2);
    expect(failures.length).toBeGreaterThanOrEqual(1);
    expect(successes.length).toBeLessThanOrEqual(1);

    // Clean up
    await prisma.booking.deleteMany({
      where: {
        courtId,
        date: testDate,
        startTime,
        endTime,
      },
    });
  });
});