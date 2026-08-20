import { prisma } from "@/lib/prisma";
import ClientReportsPage from "./client-reports";

async function getReportData() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfYear = new Date(today.getFullYear(), 0, 1);

  const [
    totalBookings,
    totalRevenue,
    monthlyRevenue,
    yearlyRevenue,
    bookingsByCourt,
    bookingsByStatus,
    busiestHours,
  ] = await Promise.all([
    prisma.booking.count(),
    prisma.booking.aggregate({ _sum: { totalPrice: true }, where: { status: "CONFIRMED" } }),
    prisma.booking.aggregate({ _sum: { totalPrice: true }, where: { status: "CONFIRMED", date: { gte: startOfMonth } } }),
    prisma.booking.aggregate({ _sum: { totalPrice: true }, where: { status: "CONFIRMED", date: { gte: startOfYear } } }),
    prisma.booking.groupBy({ by: ["courtId"], where: { status: "CONFIRMED" }, _count: { id: true }, _sum: { totalPrice: true } }),
    prisma.booking.groupBy({ by: ["status"], _count: { id: true } }),
    prisma.booking.groupBy({ by: ["startTime"], where: { status: "CONFIRMED" }, _count: { id: true }, orderBy: { _count: { id: "desc" } }, take: 5 }),
  ]);

  const courts = await prisma.court.findMany();
  const courtMap = new Map(courts.map((c) => [c.id, c.name]));

  return {
    totalBookings,
    totalRevenue: Number(totalRevenue._sum.totalPrice || 0),
    monthlyRevenue: Number(monthlyRevenue._sum.totalPrice || 0),
    yearlyRevenue: Number(yearlyRevenue._sum.totalPrice || 0),
    bookingsByCourt: bookingsByCourt.map((b) => ({
      court: courtMap.get(b.courtId) || "Unknown",
      count: b._count.id,
      revenue: Number(b._sum.totalPrice || 0),
    })),
    bookingsByStatus: bookingsByStatus.map((b) => ({
      status: b.status,
      count: b._count.id,
    })),
    busiestHours: busiestHours.map((h) => ({
      hour: `${String(h.startTime).padStart(2, '0')}:00 - ${String(h.startTime + 1).padStart(2, '0')}:00`,
      count: h._count.id,
    })),
  };
}

export default async function AdminReportsPage() {
  const data = await getReportData();

  return <ClientReportsPage data={data} />;
}