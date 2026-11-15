import { BookingStatus, Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { notifyBookingCreated } from "@/features/notification/server/notification.service";
import {
  compareDateOnly,
  getZonedParts,
  toDateOnly,
  todayDateOnly,
  zonedDateAtHour,
} from "@/shared/lib/date";
import { AppError, ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/shared/api/errors";
import { calculateTotal } from "@/features/booking/lib/pricing";
import { isWithinOperatingHours } from "@/features/booking/lib/slots";
import { getOperatingHours, getPricePerHour } from "@/features/booking/server/availability.service";

const MIN_CANCEL_NOTICE_MS = 3 * 60 * 60 * 1000;
const PAYMENT_WINDOW_MS = 60 * 60 * 1000;

export interface CreateBookingInput {
  courtId: number;
  date: Date;
  startTime: number;
  endTime: number;
  userName: string;
  userPhone: string;
}

export function normalizePhone(input: string): string {
  let phone = input.trim().replace(/[-\s]/g, "");

  if (phone.startsWith("+62")) phone = `0${phone.slice(3)}`;
  else if (phone.startsWith("628")) phone = `0${phone.slice(2)}`;

  return phone;
}

function validateBookingInput({
  courtId,
  date,
  startTime,
  endTime,
  userName,
  userPhone,
}: CreateBookingInput) {
  const cleanName = userName.trim();
  const cleanPhone = normalizePhone(userPhone);

  if (cleanName.length < 3) throw new ValidationError("Nama pemesan minimal 3 karakter");
  if (!/^08\d{8,11}$/.test(cleanPhone)) {
    throw new ValidationError("Nomor HP tidak valid (gunakan format Indonesia seperti 08123456789)");
  }

  if (!Number.isInteger(courtId) || courtId <= 0) {
    throw new ValidationError("Lapangan tidak valid");
  }

  if (!Number.isInteger(startTime) || !Number.isInteger(endTime) || startTime >= endTime) {
    throw new ValidationError("Jam selesai harus setelah jam mulai");
  }

  if (Number.isNaN(date.getTime())) {
    throw new ValidationError("Tanggal tidak valid");
  }

  return { cleanName, cleanPhone, normalizedDate: toDateOnly(date) };
}

async function assertBookableDate(date: Date, startTime: number) {
  const today = todayDateOnly();
  const comparison = compareDateOnly(date, today);

  if (comparison < 0) {
    throw new ValidationError("Tidak dapat melakukan booking pada tanggal yang sudah lewat");
  }

  if (comparison === 0) {
    const currentHour = getZonedParts(new Date()).hour;
    if (startTime <= currentHour) {
      throw new ValidationError("Tidak dapat melakukan booking pada jam yang sudah terlewat");
    }
  }
}

export async function createBooking(input: CreateBookingInput) {
  const { cleanName, cleanPhone, normalizedDate } = validateBookingInput(input);

  await assertBookableDate(normalizedDate, input.startTime);

  const now = new Date();

  const booking = await prisma.$transaction(
    async (tx) => {
      // Serialize writers for the same court. The slot re-check below still runs inside the lock.
      await tx.$executeRaw`SELECT id FROM courts WHERE id = ${input.courtId} FOR UPDATE`;

      const court = await tx.court.findUnique({ where: { id: input.courtId } });
      if (!court) throw new NotFoundError("Lapangan tidak ditemukan");
      if (!court.isActive) throw new ConflictError("Lapangan sedang tidak aktif");

      const blacklist = await tx.blacklist.findUnique({ where: { phone: cleanPhone } });
      if (blacklist) {
        throw new ForbiddenError("Nomor HP Anda diblacklist. Silakan hubungi admin.");
      }

      const hours = await getOperatingHours(tx);
      if (!isWithinOperatingHours(input.startTime, input.endTime, hours)) {
        throw new ValidationError(
          `Jam operasional ${hours.open}:00 - ${hours.close}:00. Silakan pilih jam lain.`
        );
      }

      await tx.booking.updateMany({
        where: {
          courtId: input.courtId,
          date: normalizedDate,
          status: BookingStatus.PENDING_PAYMENT,
          expiresAt: { lt: now },
        },
        data: { status: BookingStatus.EXPIRED },
      });

      const blocked = await tx.blockedSlot.findFirst({
        where: {
          courtId: input.courtId,
          date: normalizedDate,
          AND: [
            { startTime: { lt: input.endTime } },
            { endTime: { gt: input.startTime } },
          ],
        },
      });

      if (blocked) throw new ConflictError("Slot tidak tersedia (diblokir admin)");

      const existing = await tx.booking.findFirst({
        where: {
          courtId: input.courtId,
          date: normalizedDate,
          OR: [
            // Confirmed/verifying bookings always block, regardless of their payment deadline.
            { status: { in: [BookingStatus.WAITING_VERIFICATION, BookingStatus.CONFIRMED] } },
            // Unpaid bookings only block until their payment window closes.
            {
              status: BookingStatus.PENDING_PAYMENT,
              expiresAt: { gte: now },
            },
          ],
          AND: [
            { startTime: { lt: input.endTime } },
            { endTime: { gt: input.startTime } },
          ],
        },
        select: { id: true },
      });

      if (existing) throw new ConflictError("Slot telah dibooking oleh orang lain");

      const pricePerHour = await getPricePerHour(tx);
      const totalPrice = calculateTotal(input.startTime, input.endTime, pricePerHour);

      return tx.booking.create({
        data: {
          courtId: input.courtId,
          date: normalizedDate,
          startTime: input.startTime,
          endTime: input.endTime,
          userName: cleanName,
          userPhone: cleanPhone,
          totalPrice,
          expiresAt: new Date(now.getTime() + PAYMENT_WINDOW_MS),
          status: BookingStatus.PENDING_PAYMENT,
          payment: {
            create: { amount: totalPrice, status: "UNPAID" },
          },
          statusHistory: {
            create: {
              newStatus: BookingStatus.PENDING_PAYMENT,
              changedBy: "SYSTEM",
              notes: "Booking created",
            },
          },
        },
        include: { court: true },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );

  // Notifications must never break a completed booking.
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
  } catch (error) {
    console.error("WhatsApp notification failed (non-blocking):", error);
  }

  return booking;
}

export async function getBookingsByUser(userPhone: string) {
  return prisma.booking.findMany({
    where: { userPhone: normalizePhone(userPhone) },
    orderBy: { createdAt: "desc" },
    include: { court: true },
  });
}

export async function getBookingById(bookingId: string) {
  return prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      court: true,
      payment: true,
      statusHistory: { orderBy: { createdAt: "asc" } },
    },
  });
}

export async function cancelBooking(bookingId: string) {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({ where: { id: bookingId } });

    if (!booking) throw new NotFoundError("Booking tidak ditemukan");
    if (booking.status === BookingStatus.CANCELLED) {
      throw new ConflictError("Booking sudah dibatalkan");
    }
    if (booking.status === BookingStatus.COMPLETED) {
      throw new ConflictError("Booking yang sudah selesai tidak dapat dibatalkan");
    }

    if (booking.status === BookingStatus.CONFIRMED) {
      const startAt = zonedDateAtHour(booking.date, booking.startTime);
      if (startAt.getTime() - Date.now() < MIN_CANCEL_NOTICE_MS) {
        throw new ConflictError("Pembatalan harus dilakukan minimal 3 jam sebelum jadwal");
      }
    }

    return tx.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CANCELLED,
        statusHistory: {
          create: {
            oldStatus: booking.status,
            newStatus: BookingStatus.CANCELLED,
            changedBy: "USER",
            notes: "Cancelled by user",
          },
        },
      },
    });
  });
}

/** Marks unpaid bookings as expired. Returns the affected bookings (with court) for notifications. */
export async function expireUnpaidBookings(now = new Date()) {
  const expired = await prisma.booking.findMany({
    where: {
      status: BookingStatus.PENDING_PAYMENT,
      expiresAt: { lt: now },
    },
    include: { court: true },
  });

  if (expired.length === 0) return [];

  await prisma.$transaction(
    expired.map((booking) =>
      prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: BookingStatus.EXPIRED,
          statusHistory: {
            create: {
              oldStatus: BookingStatus.PENDING_PAYMENT,
              newStatus: BookingStatus.EXPIRED,
              changedBy: "SYSTEM",
              notes: "Booking kadaluarsa (waktu pembayaran habis)",
            },
          },
        },
      })
    )
  );

  return expired;
}

export function assertBookingStatusTransition(current: BookingStatus, next: BookingStatus) {
  const allowed: Record<BookingStatus, BookingStatus[]> = {
    [BookingStatus.PENDING_PAYMENT]: [BookingStatus.CANCELLED],
    [BookingStatus.WAITING_VERIFICATION]: [
      BookingStatus.CONFIRMED,
      BookingStatus.REJECTED,
      BookingStatus.CANCELLED,
    ],
    [BookingStatus.CONFIRMED]: [BookingStatus.COMPLETED, BookingStatus.CANCELLED],
    [BookingStatus.COMPLETED]: [],
    [BookingStatus.CANCELLED]: [],
    [BookingStatus.REJECTED]: [],
    [BookingStatus.EXPIRED]: [],
  };

  if (!allowed[current].includes(next)) {
    throw new AppError(`Status tidak dapat diubah dari ${current} ke ${next}`, 409);
  }
}

/**
 * Admin-side status edit. It deliberately reuses the same transition table as the
 * payment flow, and keeps Payment in sync so the two records cannot disagree.
 */
export async function updateBookingStatusByAdmin(
  bookingId: string,
  nextStatus: BookingStatus,
  changedBy: string
) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { payment: true },
  });

  if (!booking) throw new NotFoundError("Booking tidak ditemukan");

  assertBookingStatusTransition(booking.status, nextStatus);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: nextStatus,
        statusHistory: {
          create: {
            oldStatus: booking.status,
            newStatus: nextStatus,
            changedBy,
            notes: `Status diubah oleh admin menjadi ${nextStatus}`,
          },
        },
      },
    });

    if (booking.payment) {
      if (nextStatus === BookingStatus.CONFIRMED) {
        await tx.payment.update({
          where: { id: booking.payment.id },
          data: { status: "PAID", verifiedAt: new Date() },
        });
      } else if (nextStatus === BookingStatus.REJECTED) {
        await tx.payment.update({
          where: { id: booking.payment.id },
          data: { status: "REJECTED", rejectionReason: "Ditolak oleh admin" },
        });
      }
    }

    return updated;
  });
}
