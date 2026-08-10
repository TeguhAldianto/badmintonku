import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: code },
      include: {
        court: true,
        payment: true,
        statusHistory: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, message: "Booking tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: booking });
  } catch {
    return NextResponse.json(
      { success: false, message: "Gagal mengambil detail booking" },
      { status: 500 }
    );
  }
}