import { prisma } from "@/lib/prisma";
import { validateBookingSlot } from "@/services/availability.service";
import { notifyBookingCreated } from "@/services/notification.service";
import { BookingStatus, Prisma } from "@prisma/client";

export async function createBooking({
  courtId,
  date,
  startTime,
  endTime,
  userName,
  userPhone,
}: {
  courtId: number;
  date: Date;
  startTime: number;
  endTime: number;
  userName: string;
  userPhone: string;
}) {
  if (startTime >= endTime) throw new Error("Jam selesai harus setelah jam mulai");

  const validation = await validateBookingSlot(courtId, date, startTime, endTime);
  if (!validation.available) {
    throw new Error(validation.reason || "Slot tidak tersedia");
  }

  const pricePerHour = 50000;
  const totalPrice = (endTime - startTime) * pricePerHour;

  // Use Serializable transaction isolation to prevent race conditions in concurrent bookings
  const booking = await prisma.$transaction(async (tx) => {
    const existing = await tx.booking.findFirst({
      where: {
        courtId,
        date,
        status: { in: ["PENDING_PAYMENT", "WAITING_VERIFICATION", "CONFIRMED"] },
        AND: [{ startTime: { lt: endTime } }, { endTime: { gt: startTime } }],
      },
    });

    if (existing) {
      throw new Error("Slot telah dibooking oleh orang lain");
    }

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    const newBooking = await tx.booking.create({
      data: {
        courtId,
        date,
        startTime,
        endTime,
        userName,
        userPhone,
        totalPrice,
        expiresAt,
        status: BookingStatus.PENDING_PAYMENT,
        payment: {
          create: {
            amount: totalPrice,
            status: "UNPAID",
          },
        },
        statusHistory: {
          create: {
            newStatus: BookingStatus.PENDING_PAYMENT,
            changedBy: "SYSTEM",
            notes: "Booking created",
          },
        },
      },
      include: {
        court: true,
      },
    });

    return newBooking;
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  });

  // Trigger WhatsApp notification AFTER transaction commit (rule: never inside tx)
  try {
    await notifyBookingCreated({
      id: booking.id,
      userPhone: booking.userPhone,
      userName: booking.userName,
      courtName: booking.court.name,
      date: booking.date,
      startTime: booking.startTime,
      endTime: booking.endTime,
    });
  } catch (err) {
    console.error("WhatsApp notification failed (non-blocking):", err);
  }

  return booking;
}
