import { z } from "zod";
import { BookingStatus } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { requireAdmin } from "@/server/auth/guards";
import { ConflictError, ValidationError } from "@/shared/api/errors";
import { parseDateOnly } from "@/shared/lib/date";
import { checkTimeOverlap } from "@/features/booking/lib/slots";
import { fail, handleRouteError, ok, readJson } from "@/shared/api/response";

const blockSchema = z
  .object({
    courtId: z.coerce.number().int().positive("Lapangan tidak valid"),
    date: z.string().min(1, "Tanggal wajib diisi"),
    startTime: z.coerce.number().int().min(0).max(24),
    endTime: z.coerce.number().int().min(0).max(24),
    reason: z.string().trim().max(200).optional(),
  })
  .refine((value) => value.startTime < value.endTime, {
    message: "Jam selesai harus setelah jam mulai",
    path: ["endTime"],
  });

export async function GET(request: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const courtId = searchParams.get("courtId");
    const dateParam = searchParams.get("date");

    const where: { courtId?: number; date?: Date } = {};
    if (courtId) {
      const parsedCourtId = Number.parseInt(courtId, 10);
      if (!Number.isInteger(parsedCourtId)) return fail("courtId tidak valid", 400);
      where.courtId = parsedCourtId;
    }
    if (dateParam) {
      const date = parseDateOnly(dateParam);
      if (!date) return fail("Format tanggal harus YYYY-MM-DD", 400);
      where.date = date;
    }

    const blockedSlots = await prisma.blockedSlot.findMany({
      where,
      orderBy: { startTime: "asc" },
    });

    return ok(blockedSlots);
  } catch (error) {
    return handleRouteError(error, "Gagal mengambil jadwal yang diblokir");
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();

    const body = await readJson<unknown>(request);
    const parsed = blockSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Data blokir tidak valid");
    }

    const date = parseDateOnly(parsed.data.date);
    if (!date) throw new ValidationError("Format tanggal harus YYYY-MM-DD");

    const { courtId, startTime, endTime, reason } = parsed.data;

    const [court, blockingBookings, existingBlocks] = await Promise.all([
      prisma.court.findUnique({ where: { id: courtId } }),
      prisma.booking.findMany({
        where: {
          courtId,
          date,
          status: {
            in: [
              BookingStatus.PENDING_PAYMENT,
              BookingStatus.WAITING_VERIFICATION,
              BookingStatus.CONFIRMED,
            ],
          },
        },
        select: { startTime: true, endTime: true },
      }),
      prisma.blockedSlot.findMany({
        where: { courtId, date },
        select: { startTime: true, endTime: true },
      }),
    ]);

    if (!court) throw new ValidationError("Lapangan tidak ditemukan");

    const clashesWithBooking = blockingBookings.some((booking) =>
      checkTimeOverlap(startTime, endTime, booking.startTime, booking.endTime)
    );
    if (clashesWithBooking) {
      throw new ConflictError("Tidak dapat memblokir slot yang sudah dibooking");
    }

    const clashesWithBlock = existingBlocks.some((block) =>
      checkTimeOverlap(startTime, endTime, block.startTime, block.endTime)
    );
    if (clashesWithBlock) {
      throw new ConflictError("Slot tersebut sudah diblokir");
    }

    const blocked = await prisma.blockedSlot.create({
      data: { courtId, date, startTime, endTime, reason },
    });

    return ok(blocked, 201);
  } catch (error) {
    return handleRouteError(error, "Gagal memblokir jadwal");
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const parsedId = Number.parseInt(id ?? "", 10);
    if (!id || !Number.isInteger(parsedId) || parsedId <= 0) {
      return fail("ID diperlukan", 400);
    }

    await prisma.blockedSlot.delete({ where: { id: parsedId } });
    return ok({ deleted: true });
  } catch (error) {
    return handleRouteError(error, "Gagal melepas blokir");
  }
}
