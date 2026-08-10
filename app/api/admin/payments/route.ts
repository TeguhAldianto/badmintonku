import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const payments = await prisma.payment.findMany({
    orderBy: { createdAt: "desc" },
    include: { booking: true },
  });

  return NextResponse.json({ success: true, data: payments });
}