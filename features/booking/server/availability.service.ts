import { BookingStatus, Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { toDateOnly } from "@/shared/lib/date";
import type { OperatingHours, TimeSlot } from "@/features/booking/types";
import {
  DEFAULT_OPERATING_HOURS,
  checkTimeOverlap,
  generateTimeSlots,
  normalizeOperatingHours,
} from "@/features/booking/lib/slots";
import { normalizePricePerHour } from "@/features/booking/lib/pricing";

type DbClient = Prisma.TransactionClient | typeof prisma;

export async function getOperatingHours(client: DbClient = prisma): Promise<OperatingHours> {
  const config = await client.config.findUnique({ where: { key: "operational_hours" } });
  if (!config) return DEFAULT_OPERATING_HOURS;

  try {
    return normalizeOperatingHours(JSON.parse(config.value));
  } catch {
    return DEFAULT_OPERATING_HOURS;
  }
}

export async function getPricePerHour(client: DbClient = prisma): Promise<number> {
  const config = await client.config.findUnique({ where: { key: "PRICE_PER_HOUR" } });
  return normalizePricePerHour(config?.value);
}

/** Returns the availability of every slot for one court/day using the same rules as booking. */
export async function getCourtAvailability(
  courtId: number,
  date: Date,
  client: DbClient = prisma
): Promise<TimeSlot[]> {
  const normalizedDate = toDateOnly(date);
  const now = new Date();

  const [hours, bookings, blockedSlots] = await Promise.all([
    getOperatingHours(client),
    client.booking.findMany({
      where: {
        courtId,
        date: normalizedDate,
        OR: [
          {
            status: {
              in: [BookingStatus.WAITING_VERIFICATION, BookingStatus.CONFIRMED],
            },
          },
          {
            status: BookingStatus.PENDING_PAYMENT,
            expiresAt: { gte: now },
          },
        ],
      },
      select: { startTime: true, endTime: true, status: true },
    }),
    client.blockedSlot.findMany({
      where: { courtId, date: normalizedDate },
      select: { startTime: true, endTime: true },
    }),
  ]);

  return generateTimeSlots(hours).map((slot) => {
    const booking = bookings.find((item) =>
      checkTimeOverlap(slot.startTime, slot.endTime, item.startTime, item.endTime)
    );

    if (booking) {
      return {
        ...slot,
        status: booking.status === BookingStatus.PENDING_PAYMENT ? "PENDING" : "BOOKED",
      };
    }

    const isBlocked = blockedSlots.some((item) =>
      checkTimeOverlap(slot.startTime, slot.endTime, item.startTime, item.endTime)
    );

    return { ...slot, status: isBlocked ? "BLOCKED" : "AVAILABLE" };
  });
}

/** Validates a requested slot without writing anything. */
export async function validateBookingSlot(
  courtId: number,
  date: Date,
  startTime: number,
  endTime: number
): Promise<{ available: boolean; reason?: string }> {
  const slots = await getCourtAvailability(courtId, date);
  const conflict = slots.find(
    (slot) =>
      checkTimeOverlap(startTime, endTime, slot.startTime, slot.endTime) &&
      slot.status !== "AVAILABLE"
  );

  if (conflict) {
    return {
      available: false,
      reason: `Slot ${conflict.startTime}:00 - ${conflict.endTime}:00 berstatus ${conflict.status}`,
    };
  }

  return { available: true };
}
