import { createBookingSchema } from "@/features/booking/schemas";
import { createBooking } from "@/features/booking/server/booking.service";
import { parseDateOnly } from "@/shared/lib/date";
import { fail, handleRouteError, ok, readJson } from "@/shared/api/response";

export async function POST(request: Request) {
  try {
    const body = await readJson<unknown>(request);
    const parsed = createBookingSchema.safeParse(body);

    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Data booking tidak lengkap", 400);
    }

    const date = parseDateOnly(parsed.data.date);
    if (!date) return fail("Format tanggal harus YYYY-MM-DD", 400);

    const booking = await createBooking({
      courtId: parsed.data.courtId,
      date,
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
      userName: parsed.data.userName,
      userPhone: parsed.data.userPhone,
    });

    return ok(booking, 201);
  } catch (error) {
    return handleRouteError(error, "Gagal membuat booking");
  }
}
