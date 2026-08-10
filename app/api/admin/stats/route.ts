import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const bookingsToday = await prisma.booking.count({
    where: { date: { gte: today, lt: tomorrow } },
  });
  
  const pending = await prisma.booking.count({
    where: { status: "WAITING_VERIFICATION" },
  });
  
  const revenue = await prisma.booking.aggregate({
    where: { status: "CONFIRMED" },
    _sum: { totalPrice: true },
  });

  return NextResponse.json({
    bookingsToday,
    pending,
    revenue: revenue._sum.totalPrice || 0,
  });
}