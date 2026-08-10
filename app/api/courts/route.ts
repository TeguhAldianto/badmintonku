import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const courts = await prisma.court.findMany({
      orderBy: { id: "asc" },
    });
    return NextResponse.json({ success: true, data: courts });
  } catch {
    return NextResponse.json(
      { success: false, message: "Gagal mengambil data lapangan" },
      { status: 500 }
    );
  }
}