import { listPayments } from "@/features/admin/server/queries";
import { requireAdmin } from "@/server/auth/guards";
import { handleRouteError, ok } from "@/shared/api/response";

export async function GET(request: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const { payments, meta } = await listPayments({
      status: searchParams.get("status") ?? undefined,
      page: Number.parseInt(searchParams.get("page") ?? "1", 10),
      pageSize: Number.parseInt(searchParams.get("pageSize") ?? "50", 10),
    });

    return ok(payments, 200, meta);
  } catch (error) {
    return handleRouteError(error, "Gagal mengambil data pembayaran");
  }
}
