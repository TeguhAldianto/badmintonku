import { z } from "zod";

import {
  getBookingsByCodes,
  toGuestBookingSummary,
} from "@/features/booking/server/booking.service";
import { fail, handleRouteError, ok, readJson } from "@/shared/api/response";

const batchSchema = z.object({
  codes: z.array(z.string().trim().min(1)).max(50, "Maksimal 50 tiket per permintaan"),
});

/** One request for all saved ticket codes, so the ticket list does not fan out per code. */
export async function POST(request: Request) {
  try {
    const parsed = batchSchema.safeParse(await readJson<unknown>(request));
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Data tidak valid", 400);
    }

    const bookings = await getBookingsByCodes(parsed.data.codes);
    return ok(bookings.map(toGuestBookingSummary));
  } catch (error) {
    return handleRouteError(error, "Gagal mengambil tiket");
  }
}
