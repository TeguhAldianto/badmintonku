import { createBooking } from "../services/booking.service";
import { prisma } from "../lib/prisma";

async function runLoadTest() {
  console.log("=== STARTING LOAD TEST & RACE CONDITION SIMULATION ===");
  const startTime = Date.now();

  const court = await prisma.court.findFirst();
  if (!court) {
    console.error("No courts found in database. Run seed first.");
    process.exit(1);
  }

  // Use a unique future date and time slot for this test run
  const testDate = new Date();
  testDate.setDate(testDate.getDate() + 7); // 7 days in future
  testDate.setHours(0, 0, 0, 0);

  const startTimeSlot = 14; 
  const endTimeSlot = 15;
  const userPhone = "089999999999";

  console.log(`Testing concurrent bookings for Court: ${court.name} on ${testDate.toISOString().split("T")[0]} at ${startTimeSlot}:00-${endTimeSlot}:00`);
  console.log(`Launching 10 concurrent booking requests for the exact same slot...`);

  const promises = Array.from({ length: 10 }).map((_, index) => 
    createBooking({
      courtId: court.id,
      date: testDate,
      startTime: startTimeSlot,
      endTime: endTimeSlot,
      userName: `Load Test User ${index + 1}`,
      userPhone: userPhone,
    }).catch(err => ({ error: err.message }))
  );

  const results = await Promise.all(promises);
  const duration = Date.now() - startTime;

  let successes = 0;
  let failures = 0;

  results.forEach((res, idx) => {
    if (res && typeof res === 'object' && 'error' in res) {
      failures++;
      console.log(`[Request ${idx + 1}] REJECTED: ${(res as any).error}`);
    } else {
      successes++;
      console.log(`[Request ${idx + 1}] SUCCESS: Booking ID ${(res as any)?.id}`);
    }
  });

  console.log("\n=== LOAD TEST RESULTS SUMMARY ===");
  console.log(`Total Requests: 10`);
  console.log(`Successful Bookings: ${successes}`);
  console.log(`Rejected (Race Condition Handled): ${failures}`);
  console.log(`Total Duration: ${duration}ms`);
  console.log(`Average Latency: ${(duration / 10).toFixed(2)}ms`);
  console.log(`Status: ${successes === 1 && failures === 9 ? "PASS" : "WARNING"}`);

  // Cleanup test bookings
  await prisma.booking.deleteMany({
    where: { date: testDate, startTime: startTimeSlot }
  });
  console.log("Cleanup completed.");
}

runLoadTest().catch(console.error);
