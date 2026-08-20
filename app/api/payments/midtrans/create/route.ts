import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSnapToken } from "@/services/midtrans.service";
import { PaymentStatus } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { bookingCode } = body;

    if (!bookingCode) {
      return NextResponse.json(
        { success: false, message: "Booking code wajib diisi" },
        { status: 400 }
      );
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingCode },
      include: { payment: true },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, message: "Booking tidak ditemukan" },
        { status: 404 }
      );
    }

    // Only allow payment if booking is PENDING_PAYMENT
    if (booking.status !== "PENDING_PAYMENT") {
      return NextResponse.json(
        { success: false, message: "Booking tidak dalam status menunggu pembayaran" },
        { status: 400 }
      );
    }

    // Check if payment already exists and is not UNPAID
    if (booking.payment && booking.payment.status !== PaymentStatus.UNPAID) {
      return NextResponse.json(
        { success: false, message: "Pembayaran sudah diproses" },
        { status: 400 }
      );
    }

    // Create Midtrans Snap token
    const token = await createSnapToken({
      id: booking.id,
      totalPrice: Number(booking.totalPrice),
      userName: booking.userName,
      userPhone: booking.userPhone,
    });

    // Update payment with Midtrans order ID (booking ID as order_id)
    if (booking.payment) {
      await prisma.payment.update({
        where: { id: booking.payment.id },
        data: {
          midtransOrderId: booking.id,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        token,
        redirectUrl: process.env.MIDTRANS_IS_PRODUCTION === 'true'
          ? `https://app.midtrans.com/snap/v3/redirection/${token}`
          : `https://app.sandbox.midtrans.com/snap/v3/redirection/${token}`,
      },
    });
  } catch (error: unknown) {
    console.error("Error creating Midtrans snap token:", error);
    const message = error instanceof Error ? error.message : "Gagal membuat token pembayaran";
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}