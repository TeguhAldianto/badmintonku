import { availabilityQuerySchema } from "@/features/booking/schemas";
import { getCourtAvailability } from "@/features/booking/server/availability.service";
import { getOperatingHours } from "@/features/booking/server/availability.service";
import { parseDateOnly } from "@/shared/lib/date";
import { fail, handleRouteError, ok } from "@/shared/api/response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = availabilityQuerySchema.safeParse({
      courtId: searchParams.get("courtId") ?? undefined,
      date: searchParams.get("date") ?? undefined,
    });

    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Parameter tidak valid", 400);
    }

    const date = parseDateOnly(parsed.data.date);
    if (!date) return fail("Format tanggal harus YYYY-MM-DD", 400);

    const [slots, hours] = await Promise.all([
      getCourtAvailability(parsed.data.courtId, date),
      getOperatingHours(),
    ]);

    return ok({ slots, operatingHours: hours });
  } catch (error) {
    return handleRouteError(error, "Gagal mengambil ketersediaan jadwal");
  }
}
