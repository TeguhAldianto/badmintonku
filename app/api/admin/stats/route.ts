import { getQuickStats } from "@/features/admin/server/queries";
import { requireAdmin } from "@/server/auth/guards";
import { handleRouteError, ok } from "@/shared/api/response";

export async function GET() {
  try {
    await requireAdmin();
    return ok(await getQuickStats());
  } catch (error) {
    return handleRouteError(error, "Gagal mengambil statistik");
  }
}
