import { prisma } from "@/lib/prisma";

export const OPERATING_HOURS = {
  OPEN: 8,
  CLOSE: 21,
};

export const ACTIVE_BOOKING_STATUSES = [
  "PENDING_PAYMENT",
  "WAITING_VERIFICATION",
  "CONFIRMED",
] as const;

export interface TimeSlotResult {
  startTime: number;
  endTime: number;
  status: "AVAILABLE" | "BOOKED" | "PENDING" | "BLOCKED";
}

/**
 * Generates all operating slots for a given day (08:00 to 21:00 in 1-hour increments)
 */
export async function getOperatingHours(): Promise<{ open: number; close: number }> {
  try {
    const config = await prisma.config.findUnique({ where: { key: "operational_hours" } });
    if (config) {
      return JSON.parse(config.value);
    }
  } catch {
    // fallback
  }
  return { open: OPERATING_HOURS.OPEN, close: OPERATING_HOURS.CLOSE };
}

export async function generateOperatingSlots(): Promise<{ startTime: number; endTime: number }[]> {
  const { open, close } = await getOperatingHours();
  const slots: { startTime: number; endTime: number }[] = [];
  for (let h = open; h < close; h++) {
    slots.push({
      startTime: h,
      endTime: h + 1,
    });
  }
  return slots;
}

/**
 * Checks if two time ranges overlap
 * Overlap formula: (StartA < EndB) && (EndA > StartB)
 */
export function checkTimeOverlap(
  startA: number,
  endA: number,
  startB: number,
  endB: number
): boolean {
  return startA < endB && endA > startB;
}

/**
 * Core server-side function to calculate court availability for a specific date and court
 */
export async function getCourtAvailability(
  courtId: number,
  date: Date
): Promise<TimeSlotResult[]> {
  const targetDate = new Date(date);
  targetDate.setUTCHours(0, 0, 0, 0);

  // 1. Fetch active bookings (ignoring expired, cancelled, rejected, completed)
  const bookings = await prisma.booking.findMany({
    where: {
      courtId,
      date: targetDate,
      status: {
        in: [...ACTIVE_BOOKING_STATUSES],
      },
    },
  });

  // 2. Fetch blocked slots
  const blockedSlots = await prisma.blockedSlot.findMany({
    where: {
      courtId,
      date: targetDate,
    },
  });

  const baseSlots = await generateOperatingSlots();

  return baseSlots.map((slot) => {
    // Check if slot overlaps with any active booking
    const matchingBooking = bookings.find((b) =>
      checkTimeOverlap(slot.startTime, slot.endTime, b.startTime, b.endTime)
    );

    if (matchingBooking) {
      const isPending = matchingBooking.status === "PENDING_PAYMENT";
      return {
        startTime: slot.startTime,
        endTime: slot.endTime,
        status: isPending ? "PENDING" : "BOOKED",
      };
    }

    // Check if slot overlaps with any blocked slot
    const isBlocked = blockedSlots.some((bs) =>
      checkTimeOverlap(slot.startTime, slot.endTime, bs.startTime, bs.endTime)
    );

    if (isBlocked) {
      return {
        startTime: slot.startTime,
        endTime: slot.endTime,
        status: "BLOCKED",
      };
    }

    return {
      startTime: slot.startTime,
      endTime: slot.endTime,
      status: "AVAILABLE",
    };
  });
}

/**
 * Validates if a requested booking time is available and within operating hours
 */
export async function validateBookingSlot(
  courtId: number,
  date: Date,
  startTime: number,
  endTime: number
): Promise<{ available: boolean; reason?: string }> {
  // Boundary checks
  if (startTime < OPERATING_HOURS.OPEN || endTime > OPERATING_HOURS.CLOSE || startTime >= endTime) {
    return { available: false, reason: "Diluar jam operasional atau waktu tidak valid" };
  }

  const slots = await getCourtAvailability(courtId, date);

  // Check if any slot within the requested range is not available
  for (const slot of slots) {
    if (checkTimeOverlap(startTime, endTime, slot.startTime, slot.endTime)) {
      if (slot.status !== "AVAILABLE") {
        return { available: false, reason: `Slot jam ${slot.startTime}:00 - ${slot.endTime}:00 berstatus ${slot.status}` };
      }
    }
  }

  return { available: true };
}
