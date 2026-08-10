import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const courtId = searchParams.get("courtId");
  const dateStr = searchParams.get("date");

  const where: { courtId?: number; date?: Date } = {};
  if (courtId) where.courtId = parseInt(courtId, 10);
  if (dateStr) where.date = new Date(dateStr + "T00:00:00.000Z");

  const blockedSlots = await prisma.blockedSlot.findMany({ where, orderBy: { startTime: "asc" } });
  return NextResponse.json({ success: true, data: blockedSlots });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { courtId, date, startTime, endTime, reason } = body;

  const blocked = await prisma.blockedSlot.create({
    data: {
      courtId: parseInt(courtId, 10),
      date: new Date(date + "T00:00:00.000Z"),
      startTime,
      endTime,
      reason,
    },
  });

  return NextResponse.json({ success: true, data: blocked });
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ success: false, message: "ID diperlukan" }, { status: 400 });

  await prisma.blockedSlot.delete({ where: { id: parseInt(id, 10) } });
  return NextResponse.json({ success: true });
}