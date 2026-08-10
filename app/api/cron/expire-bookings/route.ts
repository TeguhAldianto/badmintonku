import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { BookingStatus } from "@prisma/client";
import { notifyBookingExpired } from "@/services/notification.service";

// This endpoint should be called by a cron job (e.g., Vercel Cron, external scheduler)
// Expected to run every 5-15 minutes
// Protect with CRON_SECRET in production

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // Optional: Validate cron secret in production
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();

    // Find all bookings that are PENDING_PAYMENT and have expired
    const expiredBookings = await prisma.booking.findMany({
      where: {
        status: "PENDING_PAYMENT",
        expiresAt: { lt: now },
      },
      include: {
        court: true,
      },
    });

    let expiredCount = 0;
    let notifiedCount = 0;

    for (const booking of expiredBookings) {
      // Update status to EXPIRED
      await prisma.booking.update({
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

      expiredCount++;

      // Trigger WhatsApp notification (non-blocking)
      try {
        await notifyBookingExpired({
          id: booking.id,
          userPhone: booking.userPhone,
          courtName: booking.court.name,
          date: booking.date,
          startTime: booking.startTime,
          endTime: booking.endTime,
        });
        notifiedCount++;
      } catch (err) {
        console.error(`Failed to send expiry notification for booking ${booking.id}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${expiredCount} expired bookings, ${notifiedCount} notifications sent`,
      data: { expiredCount, notifiedCount },
    });
  } catch (error) {
    console.error("Cron job failed:", error);
    return NextResponse.json(
      { success: false, message: "Cron job failed" },
      { status: 500 }
    );
  }
}