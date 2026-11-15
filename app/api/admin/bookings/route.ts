import { listBookings } from "@/features/admin/server/queries";
import { requireAdmin } from "@/server/auth/guards";
import { handleRouteError, ok } from "@/shared/api/response";

export async function GET(request: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const { bookings, meta } = await listBookings({
      search: searchParams.get("search") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      page: Number.parseInt(searchParams.get("page") ?? "1", 10),
      pageSize: Number.parseInt(searchParams.get("pageSize") ?? "20", 10),
    });

    return ok(bookings, 200, meta);
  } catch (error) {
    return handleRouteError(error, "Gagal mengambil data booking");
  }
}
