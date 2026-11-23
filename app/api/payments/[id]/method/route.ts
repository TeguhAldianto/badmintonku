import { z } from "zod";

import { isPaymentMethod, selectPaymentMethod } from "@/features/payment/server/payment.service";
import { fail, handleRouteError, ok, readJson } from "@/shared/api/response";

const schema = z.object({
  userPhone: z.string().min(1, "Nomor HP wajib diisi"),
  method: z.string().min(1, "Metode pembayaran wajib diisi"),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await readJson<unknown>(request);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Data tidak valid", 400);
    }
    if (!isPaymentMethod(parsed.data.method)) {
      return fail("Metode pembayaran tidak valid", 400);
    }

    const payment = await selectPaymentMethod({
      bookingId: id,
      userPhone: parsed.data.userPhone,
      method: parsed.data.method,
    });

    return ok(payment);
  } catch (error) {
    return handleRouteError(error, "Gagal menyimpan metode pembayaran");
  }
}
