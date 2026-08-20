import { prisma } from "@/lib/prisma";
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
  // 1. Validasi Input User
  const cleanName = userName.trim();
  const cleanPhone = userPhone.trim().replace(/[-\s]/g, "");

  if (cleanName.length < 3) throw new Error("Nama pemesan minimal 3 karakter");
  if (!/^(08|628|\+628)\d{8,11}$/.test(cleanPhone)) {
    throw new Error("Nomor HP tidak valid (gunakan format Indonesia seperti 08123456789)");
  }

  // 2. Validasi Jam & Waktu Lampau
  if (startTime >= endTime) throw new Error("Jam selesai harus setelah jam mulai");

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const bookingDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (bookingDate < today) {
    throw new Error("Tidak dapat melakukan booking pada tanggal yang sudah lewat");
  }

  // Jika booking untuk hari ini, pastikan jam mulai belum terlewat
  if (bookingDate.getTime() === today.getTime()) {
    const currentHour = now.getHours();
    if (startTime <= currentHour) {
      throw new Error("Tidak dapat melakukan booking pada jam yang sudah terlewat");
    }
  }

  // 3. Ambil konfigurasi harga dinamis (jika ada di tabel Config, default 50.000)
  let pricePerHour = 50000;
  const configPrice = await prisma.config.findUnique({ where: { key: "PRICE_PER_HOUR" } });
  if (configPrice && !isNaN(Number(configPrice.value))) {
    pricePerHour = Number(configPrice.value);
  }

  const totalPrice = (endTime - startTime) * pricePerHour;

  // Use Serializable transaction isolation to prevent race conditions in concurrent bookings
  const booking = await prisma.$transaction(async (tx) => {
    // MySQL row locking
    await tx.$executeRaw`SELECT * FROM courts WHERE id = ${courtId} FOR UPDATE`;

    // 4. Otomatis ubah status booking PENDING_PAYMENT yang sudah expired menjadi EXPIRED
    await tx.booking.updateMany({
      where: {
        courtId,
        date,
        status: BookingStatus.PENDING_PAYMENT,
        expiresAt: { lt: now },
      },
      data: { status: BookingStatus.EXPIRED },
    });

    // Check for blocked slots
    const blocked = await tx.blockedSlot.findFirst({
      where: {
        courtId,
        date,
        AND: [{ startTime: { lt: endTime } }, { endTime: { gt: startTime } }],
      },
    });

    if (blocked) {
      throw new Error("Slot tidak tersedia (diblokir admin)");
    }

    // Check for active bookings (PENDING_PAYMENT yang belum expired, WAITING_VERIFICATION, CONFIRMED)
    const existing = await tx.booking.findFirst({
      where: {
        courtId,
        date,
        status: { in: [BookingStatus.PENDING_PAYMENT, BookingStatus.WAITING_VERIFICATION, BookingStatus.CONFIRMED] },
        expiresAt: { gte: now }, // Hanya yang belum expired
        AND: [{ startTime: { lt: endTime } }, { endTime: { gt: startTime } }],
      },
    });

    if (existing) {
      throw new Error("Slot telah dibooking oleh orang lain");
    }

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // Batas bayar 1 jam

    const newBooking = await tx.booking.create({
      data: {
        courtId,
        date,
        startTime,
        endTime,
        userName: cleanName,
        userPhone: cleanPhone,
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
    const isBlacklisted = await prisma.blacklist.findUnique({ where: { phone: booking.userPhone } });
    if (isBlacklisted) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { status: BookingStatus.CANCELLED }
      });
      throw new Error("User diblacklist");
    }

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

export async function getBookingsByUser(userPhone: string) {
  return await prisma.booking.findMany({
    where: { userPhone },
    orderBy: { createdAt: "desc" },
    include: { court: true },
  });
}

export async function cancelBooking(bookingId: string) {
  return await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) throw new Error("Booking tidak ditemukan");
    if (booking.status === "CANCELLED") throw new Error("Booking sudah dibatalkan");
    if (booking.status === "CONFIRMED") {
      const now = new Date();
      const bookingDate = new Date(booking.date);
      // Validasi pembatalan: minimal 3 jam sebelum jadwal
      if (bookingDate.getTime() - now.getTime() < 3 * 60 * 60 * 1000) {
        throw new Error("Pembatalan harus dilakukan minimal 3 jam sebelum jadwal");
      }
    }

    return await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: "CANCELLED",
        statusHistory: {
          create: {
            newStatus: "CANCELLED",
            changedBy: "USER",
            notes: "Cancelled by user",
          },
        },
      },
    });
  });
}
