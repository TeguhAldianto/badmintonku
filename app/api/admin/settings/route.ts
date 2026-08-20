import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const openHour = formData.get("openHour")?.toString();
    const closeHour = formData.get("closeHour")?.toString();

    if (openHour !== undefined && closeHour !== undefined) {
      await prisma.config.upsert({
        where: { key: "operational_hours" },
        update: { value: JSON.stringify({ open: parseInt(openHour), close: parseInt(closeHour) }) },
        create: { key: "operational_hours", value: JSON.stringify({ open: parseInt(openHour), close: parseInt(closeHour) }) },
      });
    }

    return NextResponse.redirect(new URL("/admin/settings?success=1", request.url));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal menyimpan";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
