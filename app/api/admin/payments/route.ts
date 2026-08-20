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
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

  const [payments, total] = await prisma.$transaction([
    prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, amount: true, status: true, method: true, booking: { select: { id: true, userName: true } } },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.payment.count(),
  ]);

  return NextResponse.json({ success: true, data: payments, meta: { total, page, pageSize } });
} catch (error) {
  return NextResponse.json({ message: "Internal server error" }, { status: 500 });
}
}