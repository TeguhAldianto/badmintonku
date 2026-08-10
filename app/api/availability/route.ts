import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateTimeSlots } from "@/lib/booking";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const courtId = searchParams.get("courtId");
  const dateStr = searchParams.get("date");

  if (!courtId || !dateStr) {
    return NextResponse.json(
      { success: false, message: "courtId and date are required" },
      { status: 400 }
    );
  }

  try {
    const targetDate = new Date(dateStr + "T00:00:00.000Z");
    const parsedCourtId = parseInt(courtId, 10);

    const bookings = await prisma.booking.findMany({
      where: {
        courtId: parsedCourtId,
        date: targetDate,
        status: {
          in: ["PENDING_PAYMENT", "WAITING_VERIFICATION", "CONFIRMED"],
        },
      },
    });

    const blockedSlots = await prisma.blockedSlot.findMany({
      where: {
        courtId: parsedCourtId,
        date: targetDate,
      },
    });

    const slots = generateTimeSlots();

    const mappedSlots = slots.map((slot) => {
      const isBooked = bookings.some(
        (b) => slot.startTime >= b.startTime && slot.endTime <= b.endTime
      );
      if (isBooked) {
        const booking = bookings.find(
          (b) => slot.startTime >= b.startTime && slot.endTime <= b.endTime
        );
        return {
          ...slot,
          status: booking?.status === "PENDING_PAYMENT" ? "PENDING" : "BOOKED",
        };
      }

      const isBlocked = blockedSlots.some(
        (bs) => slot.startTime >= bs.startTime && slot.endTime <= bs.endTime
      );
      if (isBlocked) {
        return { ...slot, status: "BLOCKED" };
      }

      return slot;
    });

    return NextResponse.json({ success: true, data: mappedSlots });
  } catch {
    return NextResponse.json(
      { success: false, message: "Gagal mengambil ketersediaan jadwal" },
      { status: 500 }
    );
  }
}