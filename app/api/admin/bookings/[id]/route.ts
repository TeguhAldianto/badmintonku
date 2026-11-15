import { z } from "zod";
import { BookingStatus } from "@prisma/client";
import { requireAdmin } from "@/server/auth/guards";
import { updateBookingStatusByAdmin } from "@/features/booking/server/booking.service";
import { fail, handleRouteError, ok, readJson } from "@/shared/api/response";

const updateStatusSchema = z.object({
  status: z.enum([
    BookingStatus.CONFIRMED,
    BookingStatus.COMPLETED,
    BookingStatus.CANCELLED,
    BookingStatus.REJECTED,
  ]),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdmin();
    const { id } = await params;

    const body = await readJson<unknown>(request);
    const parsed = updateStatusSchema.safeParse(body);
    if (!parsed.success) {
      return fail("Status tidak valid", 400);
    }

    const updated = await updateBookingStatusByAdmin(
      id,
      parsed.data.status,
      session.user?.name ?? session.user?.email ?? "Admin"
    );

    return ok(updated);
  } catch (error) {
    return handleRouteError(error, "Gagal memperbarui booking");
  }
}
