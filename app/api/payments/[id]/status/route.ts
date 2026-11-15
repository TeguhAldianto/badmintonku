import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { syncMidtransPayment } from "@/features/payment/server/payment.service";
import { fail, handleRouteError, ok, readJson } from "@/shared/api/response";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const booking = await prisma.booking.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        totalPrice: true,
        expiresAt: true,
        payment: {
          select: {
            status: true,
            method: true,
            midtransTransactionId: true,
            midtransPaymentType: true,
          },
        },
      },
    });

    if (!booking) return fail("Booking tidak ditemukan", 404);

    return ok({
      bookingId: booking.id,
      bookingStatus: booking.status,
      paymentStatus: booking.payment?.status ?? "UNPAID",
      paymentMethod: booking.payment?.method ?? null,
      midtransTransactionId: booking.payment?.midtransTransactionId ?? null,
      midtransPaymentType: booking.payment?.midtransPaymentType ?? null,
      totalPrice: Number(booking.totalPrice),
      expiresAt: booking.expiresAt,
    });
  } catch (error) {
    return handleRouteError(error, "Gagal mengambil status pembayaran");
  }
}

const syncSchema = z.object({
  userPhone: z.string().min(1, "Nomor HP wajib diisi"),
});

/**
 * Phone-gated status sync. Midtrans cannot call a localhost webhook, so the guest
 * page asks Midtrans directly for the transaction status and applies it here.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await readJson<unknown>(request);
    const parsed = syncSchema.safeParse(body);

    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Data tidak valid", 400);
    }

    const data = await syncMidtransPayment(id, parsed.data.userPhone);
    return ok(data);
  } catch (error) {
    return handleRouteError(error, "Gagal mengecek status pembayaran");
  }
}
