import { getBookingById } from "@/features/booking/server/booking.service";
import { getAdminSession } from "@/server/auth/guards";
import { maskPhone } from "@/shared/lib/format";
import { fail, handleRouteError, ok } from "@/shared/api/response";

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const booking = await getBookingById(code);

    if (!booking) return fail("Booking tidak ditemukan", 404);

    const isAdmin = Boolean(await getAdminSession());

    if (isAdmin) {
      return ok(booking);
    }

    // Guests only ever get what the confirmation page needs. No raw phone number,
    // no internal status history, no payment secrets.
    return ok({
      id: booking.id,
      status: booking.status,
      date: booking.date,
      startTime: booking.startTime,
      endTime: booking.endTime,
      userName: booking.userName,
      userPhoneMasked: maskPhone(booking.userPhone),
      totalPrice: Number(booking.totalPrice),
      expiresAt: booking.expiresAt,
      court: { id: booking.court.id, name: booking.court.name },
      payment: booking.payment
        ? {
            status: booking.payment.status,
            method: booking.payment.method,
            rejectionReason: booking.payment.rejectionReason,
            hasMidtransTransaction: Boolean(booking.payment.midtransOrderId),
          }
        : null,
    });
  } catch (error) {
    return handleRouteError(error, "Gagal mengambil detail booking");
  }
}
