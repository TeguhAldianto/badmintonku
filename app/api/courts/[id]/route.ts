import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { requireAdmin } from "@/server/auth/guards";
import { ValidationError } from "@/shared/api/errors";
import { fail, handleRouteError, ok, readJson } from "@/shared/api/response";

const updateCourtSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();

    const { id } = await params;
    const courtId = Number(id);
    if (!Number.isInteger(courtId) || courtId <= 0) {
      return fail("ID lapangan tidak valid", 400);
    }

    const body = await readJson<unknown>(request);
    const parsed = updateCourtSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Data lapangan tidak valid", 400);
    }

    if (Object.keys(parsed.data).length === 0) {
      throw new ValidationError("Tidak ada perubahan yang dikirim");
    }

    const court = await prisma.court.update({
      where: { id: courtId },
      data: parsed.data,
    });

    return ok(court);
  } catch (error) {
    return handleRouteError(error, "Gagal memperbarui lapangan");
  }
}
