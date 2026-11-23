import { getPaymentStatusCounts, listPayments } from "@/features/admin/server/queries";
import { requireAdmin } from "@/server/auth/guards";
import { handleRouteError, ok } from "@/shared/api/response";

export async function GET(request: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const [{ payments, meta }, counts] = await Promise.all([
      listPayments({
        status: searchParams.get("status") ?? undefined,
        page: Number.parseInt(searchParams.get("page") ?? "1", 10),
        pageSize: Number.parseInt(searchParams.get("pageSize") ?? "20", 10),
      }),
      getPaymentStatusCounts(),
    ]);

    return ok(payments, 200, { ...meta, counts });
  } catch (error) {
    return handleRouteError(error, "Gagal mengambil data pembayaran");
  }
}
