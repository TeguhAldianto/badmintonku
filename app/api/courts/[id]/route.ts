import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, isActive } = body;

    const court = await prisma.court.update({
      where: { id: parseInt(id, 10) },
      data: {
        name: name ?? undefined,
        description: description ?? undefined,
        isActive: isActive ?? undefined,
      },
    });

    return NextResponse.json({ success: true, data: court });
  } catch {
    return NextResponse.json({ success: false, message: "Gagal memperbarui lapangan" }, { status: 500 });
  }
}