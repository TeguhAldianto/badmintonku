import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { BookingStatus } from "@prisma/client";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { status } = body;

    if (!status || !["CANCELLED", "COMPLETED", "CONFIRMED", "REJECTED"].includes(status)) {
      return NextResponse.json({ success: false, message: "Status tidak valid" }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking) {
      return NextResponse.json({ success: false, message: "Booking tidak ditemukan" }, { status: 404 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const b = await tx.booking.update({
        where: { id },
        data: {
          status: status as BookingStatus,
          statusHistory: {
            create: {
              oldStatus: booking.status,
              newStatus: status as BookingStatus,
              changedBy: session.user.name || "Admin",
              notes: `Status diubah oleh admin menjadi ${status}`,
            },
          },
        },
      });
      return b;
    });

    return NextResponse.json({ success: true, data: updated });
  } catch {
    return NextResponse.json({ success: false, message: "Gagal memperbarui booking" }, { status: 500 });
  }
}