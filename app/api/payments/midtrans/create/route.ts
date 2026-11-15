import { z } from "zod";
import { createMidtransPayment } from "@/features/payment/server/payment.service";
import { fail, handleRouteError, ok, readJson } from "@/shared/api/response";

const schema = z.object({
  bookingCode: z.string().min(1, "Booking code wajib diisi"),
  userPhone: z.string().min(1, "Nomor HP wajib diisi"),
});

export async function POST(request: Request) {
  try {
    const body = await readJson<unknown>(request);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Data tidak valid", 400);
    }

    const data = await createMidtransPayment(parsed.data.bookingCode, parsed.data.userPhone);
    return ok(data);
  } catch (error) {
    return handleRouteError(error, "Gagal membuat token pembayaran");
  }
}
