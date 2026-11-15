import { expireUnpaidBookings } from "@/features/booking/server/booking.service";
import { notifyBookingExpired, retryFailedNotifications } from "@/features/notification/server/notification.service";
import { fail, handleRouteError, ok } from "@/shared/api/response";

export async function GET(request: Request) {
  try {
    // This endpoint mutates data, so it must never run unauthenticated.
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      console.error("CRON_SECRET is not configured: refusing to run expire-bookings");
      return fail("Cron secret belum dikonfigurasi", 503);
    }

    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return fail("Unauthorized", 401);
    }

    const expiredBookings = await expireUnpaidBookings();
    let notifiedCount = 0;

    for (const booking of expiredBookings) {
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

    await retryFailedNotifications();

    return ok({ expiredCount: expiredBookings.length, notifiedCount });
  } catch (error) {
    return handleRouteError(error, "Cron job gagal");
  }
}
