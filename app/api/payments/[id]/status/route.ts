import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        payment: true,
        court: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, message: "Booking tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        bookingId: booking.id,
        bookingStatus: booking.status,
        paymentStatus: booking.payment?.status || "UNPAID",
        midtransTransactionId: booking.payment?.midtransTransactionId || null,
        midtransPaymentType: booking.payment?.midtransPaymentType || null,
        totalPrice: Number(booking.totalPrice),
        expiresAt: booking.expiresAt,
      },
    });
  } catch (error: unknown) {
    console.error("Error fetching payment status:", error);
    const message = error instanceof Error ? error.message : "Gagal mengambil status pembayaran";
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}