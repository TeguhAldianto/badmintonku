import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { requireAdmin } from "@/server/auth/guards";
import { AppError } from "@/shared/api/errors";
import { handleRouteError, ok } from "@/shared/api/response";

const settingsSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    openHour: z.coerce.number().int().min(0).max(23).optional(),
    closeHour: z.coerce.number().int().min(1).max(24).optional(),
    pricePerHour: z.coerce.number().int().positive().max(100_000_000).optional(),
  })
  .refine((value) => value.openHour === undefined || value.closeHour === undefined || value.openHour < value.closeHour, {
    message: "Jam buka harus lebih awal dari jam tutup",
    path: ["closeHour"],
  });

function readField(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export async function POST(request: Request) {
  try {
    const session = await requireAdmin();
    const formData = await request.formData();

    const parsed = settingsSchema.safeParse({
      name: readField(formData, "name"),
      openHour: readField(formData, "openHour"),
      closeHour: readField(formData, "closeHour"),
      pricePerHour: readField(formData, "pricePerHour"),
    });

    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message ?? "Pengaturan tidak valid", 400);
    }

    const { name, openHour, closeHour, pricePerHour } = parsed.data;

    if (name && session.user?.id) {
      await prisma.admin.update({ where: { id: session.user.id }, data: { name } });
    }

    if (openHour !== undefined && closeHour !== undefined) {
      const value = JSON.stringify({ open: openHour, close: closeHour });
      await prisma.config.upsert({
        where: { key: "operational_hours" },
        update: { value },
        create: { key: "operational_hours", value },
      });
    }

    if (pricePerHour !== undefined) {
      await prisma.config.upsert({
        where: { key: "PRICE_PER_HOUR" },
        update: { value: String(pricePerHour) },
        create: { key: "PRICE_PER_HOUR", value: String(pricePerHour) },
      });
    }

    return ok({ saved: true });
  } catch (error) {
    return handleRouteError(error, "Gagal menyimpan pengaturan");
  }
}
