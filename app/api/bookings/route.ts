import { NextResponse } from "next/server";
import { createBooking } from "@/services/booking.service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { courtId, date, startTime, endTime, userName, userPhone } = body;

    if (!courtId || !date || startTime === undefined || endTime === undefined || !userName || !userPhone) {
      return NextResponse.json(
        { success: false, message: "Data booking tidak lengkap" },
        { status: 400 }
      );
    }

    const booking = await createBooking({
      courtId: parseInt(courtId, 10),
      date: new Date(date + "T00:00:00.000Z"),
      startTime,
      endTime,
      userName,
      userPhone,
    });

    return NextResponse.json({ success: true, data: booking });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal membuat booking";
    const status = message.includes("tidak tersedia") || message.includes("dibooking") ? 409 : 400;
    return NextResponse.json(
      { success: false, message },
      { status }
    );
  }
}