import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");
  const status = searchParams.get("status");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { userName: { contains: search } },
      { userPhone: { contains: search } },
      { id: { contains: search } },
    ];
  }

  const bookings = await prisma.booking.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { court: true },
  });

  return NextResponse.json({ success: true, data: bookings });
}