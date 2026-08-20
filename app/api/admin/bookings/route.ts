import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(request: Request) {
  try {
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

  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

  const [bookings, total] = await prisma.$transaction([
    prisma.booking.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true, totalPrice: true, userName: true, userPhone: true, date: true, startTime: true, endTime: true, court: { select: { name: true } } },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.booking.count({ where }),
  ]);

  return NextResponse.json({ success: true, data: bookings, meta: { total, page, pageSize } });
} catch (error) {
  return NextResponse.json({ message: "Internal server error" }, { status: 500 });
}
}