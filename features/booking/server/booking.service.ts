import { BookingStatus, PaymentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import {
  notifyBookingCancelled,
  notifyBookingCreated,
  notifyPaymentApproved,
  notifyPaymentRejected,
} from "@/features/notification/server/notification.service";
import {
  compareDateOnly,
  getZonedParts,
  toDateOnly,
  todayDateOnly,
  zonedDateAtHour,
} from "@/shared/lib/date";
import { AppError, ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/shared/api/errors";
import { maskPhone } from "@/shared/lib/format";
import { calculateTotal } from "@/features/booking/lib/pricing";
import { isWithinOperatingHours } from "@/features/booking/lib/slots";
import { getOperatingHours, getPricePerHour } from "@/features/booking/server/availability.service";

const MIN_CANCEL_NOTICE_MS = 3 * 60 * 60 * 1000;
const PAYMENT_WINDOW_MS = 60 * 60 * 1000;

/** Indonesian labels for status history notes so admins do not read raw enum values. */
const STATUS_LABELS: Partial<Record<BookingStatus, string>> = {
  [BookingStatus.PENDING_PAYMENT]: "Menunggu Pembayaran",
  [BookingStatus.WAITING_VERIFICATION]: "Menunggu Verifikasi",
  [BookingStatus.CONFIRMED]: "Dikonfirmasi",
  [BookingStatus.COMPLETED]: "Selesai",
  [BookingStatus.CANCELLED]: "Dibatalkan",
  [BookingStatus.REJECTED]: "Ditolak",
  [BookingStatus.EXPIRED]: "Kadaluarsa",
};

/**
 * Turns a Prisma P2025 from a status-guarded update into a 409. Those updates include
 * the status we just read, so P2025 means another request changed it first.
 */
export async function updateWithStatusGuard<T>(operation: Promise<T>, message: string): Promise<T> {
  try {
    return await operation;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      throw new ConflictError(message);
    }
    throw error;
  }
}

export function isActiveBlockingBooking(
  booking: { status: BookingStatus; expiresAt: Date },
  now = new Date()
): boolean {
  if (booking.status === BookingStatus.WAITING_VERIFICATION || booking.status === BookingStatus.CONFIRMED) {
    return true;
  }
  if (booking.status === BookingStatus.PENDING_PAYMENT) {
    return booking.expiresAt >= now;
  }
  return false;
}

async function expireBookingsInTx(
  tx: Prisma.TransactionClient,
  where: Prisma.BookingWhereInput,
  now = new Date()
) {
  const stale = await tx.booking.findMany({
    where: { ...where, status: BookingStatus.PENDING_PAYMENT, expiresAt: { lt: now } },
    include: { payment: true },
  });

  if (stale.length === 0) return [] as typeof stale;

  await Promise.all(
    stale.map(async (booking) => {
      await tx.booking.update({
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
      });

      if (booking.payment && booking.payment.status === "UNPAID") {
        await tx.payment.update({
          where: { id: booking.payment.id },
          data: { status: "REJECTED", rejectionReason: "Booking kadaluarsa (waktu pembayaran habis)" },
        });
      }
    })
  );

  return stale;
}

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

      await expireBookingsInTx(tx, { courtId: input.courtId, date: normalizedDate }, now);

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
    take: 50,
    include: { court: true, payment: true },
  });
}

export async function getBookingsByCodes(codes: string[]) {
  if (codes.length === 0) return [];
  return prisma.booking.findMany({
    where: { id: { in: codes } },
    orderBy: { createdAt: "desc" },
    include: { court: true, payment: true },
  });
}

interface GuestBookingSource {
  id: string;
  status: BookingStatus;
  date: Date;
  startTime: number;
  endTime: number;
  userName: string;
  userPhone: string;
  totalPrice: Prisma.Decimal;
  expiresAt: Date;
  court: { id: number; name: string };
  payment: { status: PaymentStatus; method: string | null } | null;
}

/** Guest-safe shape shared by ticket recovery and the ticket-list batch endpoint. */
export function toGuestBookingSummary(booking: GuestBookingSource) {
  return {
    id: booking.id,
    status: booking.status,
    date: booking.date,
    startTime: booking.startTime,
    endTime: booking.endTime,
    userName: booking.userName,
    userPhoneMasked: maskPhone(booking.userPhone),
    totalPrice: Number(booking.totalPrice),
    expiresAt: booking.expiresAt,
    court: { id: booking.court.id, name: booking.court.name },
    payment: booking.payment
      ? { status: booking.payment.status, method: booking.payment.method }
      : null,
  };
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

export async function cancelBooking(
  bookingId: string,
  opts?: { userPhone?: string; isAdmin?: boolean }
) {
  const updated = await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: { payment: true },
    });

    if (!booking) throw new NotFoundError("Booking tidak ditemukan");

    if (!opts?.isAdmin) {
      if (!opts?.userPhone?.trim()) {
        throw new ForbiddenError("Nomor HP pemesan wajib diisi untuk membatalkan booking");
      }
      if (booking.userPhone !== normalizePhone(opts.userPhone)) {
        throw new ForbiddenError("Tidak memiliki akses ke booking ini");
      }
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new ConflictError("Booking sudah dibatalkan");
    }

    assertBookingStatusTransition(booking.status, BookingStatus.CANCELLED);

    if (booking.status === BookingStatus.CONFIRMED) {
      const startAt = zonedDateAtHour(booking.date, booking.startTime);
      if (startAt.getTime() - Date.now() < MIN_CANCEL_NOTICE_MS) {
        throw new ConflictError("Pembatalan harus dilakukan minimal 3 jam sebelum jadwal");
      }
    }

    const cancelled = await updateWithStatusGuard(
      tx.booking.update({
        where: { id: bookingId, status: booking.status },
        data: {
          status: BookingStatus.CANCELLED,
          statusHistory: {
            create: {
              oldStatus: booking.status,
              newStatus: BookingStatus.CANCELLED,
              changedBy: opts?.isAdmin ? "ADMIN" : "USER",
              notes: opts?.isAdmin ? "Dibatalkan oleh admin" : "Dibatalkan oleh pemesan",
            },
          },
        },
        include: { court: true },
      }),
      "Status booking sudah berubah. Muat ulang lalu coba lagi."
    );

    // Keep Payment in sync without overwriting a payment that settled concurrently.
    if (booking.payment) {
      await tx.payment.updateMany({
        where: {
          id: booking.payment.id,
          status: { in: [PaymentStatus.UNPAID, PaymentStatus.VERIFYING] },
        },
        data: {
          status: PaymentStatus.REJECTED,
          rejectionReason: opts?.isAdmin
            ? "Booking dibatalkan oleh admin"
            : "Booking dibatalkan oleh pemesan",
        },
      });
    }

    return cancelled;
  });

  // Confirmation must never make a successful cancellation look failed.
  try {
    await notifyBookingCancelled({
      id: updated.id,
      userPhone: updated.userPhone,
      courtName: updated.court.name,
      date: updated.date,
      startTime: updated.startTime,
      endTime: updated.endTime,
      cancelledBy: opts?.isAdmin ? "Admin arena" : "Pemesan",
    });
  } catch (error) {
    console.error("WhatsApp cancellation notification failed (non-blocking):", error);
  }

  return updated;
}

/** Marks unpaid bookings as expired. Returns the affected bookings (with court) for notifications. */
export async function expireUnpaidBookings(now = new Date()) {
  return prisma.$transaction(async (tx) => {
    const stale = await expireBookingsInTx(tx, {}, now);
    if (stale.length === 0) return [];
    return tx.booking.findMany({
      where: { id: { in: stale.map((b) => b.id) } },
      include: { court: true },
    });
  });
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

  const isDirectConfirm =
    nextStatus === BookingStatus.CONFIRMED &&
    booking.status === BookingStatus.PENDING_PAYMENT &&
    booking.payment?.status === PaymentStatus.UNPAID &&
    booking.payment?.method === "DIRECT" &&
    !booking.payment?.midtransOrderId;

  if (!isDirectConfirm) {
    assertBookingStatusTransition(booking.status, nextStatus);
  }

  if (nextStatus === BookingStatus.CONFIRMED && booking.payment) {
    const isVerified =
      booking.payment.status === PaymentStatus.VERIFYING ||
      booking.payment.status === PaymentStatus.PAID;
    const isDirectPay =
      booking.payment.status === PaymentStatus.UNPAID &&
      booking.payment.method === "DIRECT" &&
      !booking.payment.midtransOrderId;
    if (!isVerified && !isDirectPay) {
      throw new ConflictError(
        "Booking hanya dapat dikonfirmasi setelah pembayaran diverifikasi, atau ditandai Bayar di Tempat oleh admin."
      );
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await updateWithStatusGuard(
      tx.booking.update({
        where: { id: bookingId, status: booking.status },
        data: {
          status: nextStatus,
          statusHistory: {
            create: {
              oldStatus: booking.status,
              newStatus: nextStatus,
              changedBy,
              notes: `Status diubah oleh admin menjadi ${STATUS_LABELS[nextStatus] ?? nextStatus}`,
            },
          },
        },
        include: { court: true },
      }),
      "Status booking sudah berubah. Muat ulang lalu coba lagi."
    );

    if (booking.payment) {
      if (nextStatus === BookingStatus.CONFIRMED) {
        const isDirectPay =
          booking.payment.status === PaymentStatus.UNPAID &&
          booking.payment.method === "DIRECT" &&
          !booking.payment.midtransOrderId;
        await updateWithStatusGuard(
          tx.payment.update({
            where: {
              id: booking.payment.id,
              ...(isDirectPay
                ? { status: PaymentStatus.UNPAID, method: "DIRECT" }
                : { status: { in: [PaymentStatus.VERIFYING, PaymentStatus.PAID] } }),
            },
            data: {
              status: PaymentStatus.PAID,
              verifiedAt: booking.payment.verifiedAt ?? new Date(),
            },
          }),
          "Status pembayaran sudah berubah. Muat ulang lalu coba lagi."
        );
      } else if (
        nextStatus === BookingStatus.REJECTED ||
        nextStatus === BookingStatus.CANCELLED
      ) {
        // Never overwrite a payment that settled concurrently; refunds are manual.
        await tx.payment.updateMany({
          where: {
            id: booking.payment.id,
            status: { in: [PaymentStatus.UNPAID, PaymentStatus.VERIFYING] },
          },
          data: {
            status: PaymentStatus.REJECTED,
            rejectionReason:
              nextStatus === BookingStatus.REJECTED
                ? "Ditolak oleh admin"
                : "Booking dibatalkan oleh admin",
          },
        });
      }
    }

    return result;
  });

  // Keep the guest informed about admin decisions; failures must not roll back the status change.
  const notificationBase = {
    id: updated.id,
    userPhone: updated.userPhone,
    courtName: updated.court.name,
    date: updated.date,
    startTime: updated.startTime,
    endTime: updated.endTime,
  };

  try {
    if (nextStatus === BookingStatus.CONFIRMED) {
      await notifyPaymentApproved(notificationBase);
    } else if (nextStatus === BookingStatus.REJECTED) {
      await notifyPaymentRejected({ ...notificationBase, reason: "Ditolak oleh admin" });
    } else if (nextStatus === BookingStatus.CANCELLED) {
      await notifyBookingCancelled({ ...notificationBase, cancelledBy: "Admin arena" });
    }
  } catch (error) {
    console.error("WhatsApp status notification failed (non-blocking):", error);
  }

  return updated;
}
