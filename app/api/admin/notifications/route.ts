import { requireAdmin } from "@/server/auth/guards";
import { prisma } from "@/server/db/prisma";
import { ok, handleRouteError } from "@/shared/api/response";

export async function GET(request: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as "SENT" | "FAILED" | "ERROR" | null;
    const type = searchParams.get("type") as string | null;
    const q = searchParams.get("q") || "";
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 200);
    const offset = Math.max(0, Number(searchParams.get("offset")) || 0);

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (q.length > 0) {
      where.OR = [
        { referenceId: { contains: q as string } },
        { target: { contains: q as string } },
      ];
    }

    const [items, total] = await prisma.$transaction([
      prisma.notificationLog.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          target: true,
          type: true,
          referenceId: true,
          status: true,
          errorMessage: true,
          retryCount: true,
          createdAt: true,
          idempotencyKey: true,
        },
      }),
      prisma.notificationLog.count({ where }),
    ]);

    return ok({ items, total, page: Math.max(1, offset / limit + 1), limit });
  } catch (error) {
    return handleRouteError(error, "Gagal mengambil notifikasi logs");
  }
}