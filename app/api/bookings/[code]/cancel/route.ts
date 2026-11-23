import { z } from "zod";

import { cancelBooking } from "@/features/booking/server/booking.service";
import { getAdminSession } from "@/server/auth/guards";
import { fail, handleRouteError, ok, readJson } from "@/shared/api/response";

const cancelSchema = z.object({
  userPhone: z.string().trim().min(8, "Nomor HP wajib diisi"),
});

/**
 * Guest self-service cancellation. Ownership is proven with the phone number used at
 * booking time; admins can cancel without it.
 */
export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const isAdmin = Boolean(await getAdminSession());

    if (isAdmin) {
      const cancelled = await cancelBooking(code, { isAdmin: true });
      return ok(cancelled);
    }

    const body = await readJson<unknown>(request);
    const parsed = cancelSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Nomor HP wajib diisi", 400);
    }

    const cancelled = await cancelBooking(code, { userPhone: parsed.data.userPhone });
    return ok(cancelled);
  } catch (error) {
    return handleRouteError(error, "Gagal membatalkan booking");
  }
}
