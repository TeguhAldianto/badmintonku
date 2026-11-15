import { createBooking } from "@/features/booking/server/booking.service";
import { prisma } from "@/server/db/prisma";

type LoadTestOutcome =
  | { ok: true; id: string }
  | { ok: false; error: string };

const CONCURRENT_REQUESTS = 10;

async function runLoadTest() {
  console.log("=== STARTING LOAD TEST & RACE CONDITION SIMULATION ===");
  const startedAt = Date.now();

  const court = await prisma.court.findFirst();
  if (!court) {
    console.error("No courts found in database. Run seed first.");
    process.exit(1);
  }

  // UTC midnight, 7 days ahead: `date` is a MySQL DATE column and must not shift a day.
  const now = new Date();
  const testDate = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) + 7 * 24 * 60 * 60 * 1000
  );

  const startTimeSlot = 14;
  const endTimeSlot = 15;
  const userPhone = "089999999999";

  console.log(
    `Testing concurrent bookings for Court: ${court.name} on ${testDate.toISOString().split("T")[0]} at ${startTimeSlot}:00-${endTimeSlot}:00`
  );
  console.log(`Launching ${CONCURRENT_REQUESTS} concurrent booking requests for the exact same slot...`);

  const promises: Array<Promise<LoadTestOutcome>> = Array.from({
    length: CONCURRENT_REQUESTS,
  }).map((_, index) =>
    createBooking({
      courtId: court.id,
      date: testDate,
      startTime: startTimeSlot,
      endTime: endTimeSlot,
      userName: `Load Test User ${index + 1}`,
      userPhone,
    }).then(
      (booking): LoadTestOutcome => ({ ok: true, id: booking.id }),
      (error: unknown): LoadTestOutcome => ({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      })
    )
  );

  const results = await Promise.all(promises);
  const duration = Date.now() - startedAt;

  let successes = 0;
  let failures = 0;

  results.forEach((result, index) => {
    if (result.ok) {
      successes++;
      console.log(`[Request ${index + 1}] SUCCESS: Booking ID ${result.id}`);
    } else {
      failures++;
      console.log(`[Request ${index + 1}] REJECTED: ${result.error}`);
    }
  });

  console.log("\n=== LOAD TEST RESULTS SUMMARY ===");
  console.log(`Total Requests: ${CONCURRENT_REQUESTS}`);
  console.log(`Successful Bookings: ${successes}`);
  console.log(`Rejected (Race Condition Handled): ${failures}`);
  console.log(`Total Duration: ${duration}ms`);
  console.log(`Average Latency: ${(duration / CONCURRENT_REQUESTS).toFixed(2)}ms`);
  console.log(`Status: ${successes === 1 && failures === CONCURRENT_REQUESTS - 1 ? "PASS" : "WARNING"}`);

  await prisma.payment.deleteMany({ where: { booking: { date: testDate, startTime: startTimeSlot } } });
  await prisma.booking.deleteMany({ where: { date: testDate, startTime: startTimeSlot } });
  console.log("Cleanup completed.");
}

runLoadTest()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
