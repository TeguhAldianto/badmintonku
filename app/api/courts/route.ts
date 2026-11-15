import { prisma } from "@/server/db/prisma";
import { getPricePerHour } from "@/features/booking/server/availability.service";
import { handleRouteError, ok } from "@/shared/api/response";

export async function GET() {
  try {
    const [courts, pricePerHour] = await Promise.all([
      prisma.court.findMany({ orderBy: { id: "asc" } }),
      getPricePerHour(),
    ]);

    return ok(courts.map((court) => ({ ...court, pricePerHour })));
  } catch (error) {
    return handleRouteError(error, "Gagal mengambil data lapangan");
  }
}
