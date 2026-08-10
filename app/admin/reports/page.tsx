import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";

async function getReportData() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfYear = new Date(today.getFullYear(), 0, 1);

  const [totalBookings, totalRevenue, monthlyRevenue, yearlyRevenue, bookingsByCourt, bookingsByStatus] = await Promise.all([
    prisma.booking.count(),
    prisma.booking.aggregate({ _sum: { totalPrice: true }, where: { status: "CONFIRMED" } }),
    prisma.booking.aggregate({ _sum: { totalPrice: true }, where: { status: "CONFIRMED", date: { gte: startOfMonth } } }),
    prisma.booking.aggregate({ _sum: { totalPrice: true }, where: { status: "CONFIRMED", date: { gte: startOfYear } } }),
    prisma.booking.groupBy({ by: ["courtId"], where: { status: "CONFIRMED" }, _count: { id: true }, _sum: { totalPrice: true } }),
    prisma.booking.groupBy({ by: ["status"], _count: { id: true } }),
  ]);

  const courts = await prisma.court.findMany();
  const courtMap = new Map(courts.map((c) => [c.id, c.name]));

  return {
    totalBookings,
    totalRevenue: totalRevenue._sum.totalPrice || 0,
    monthlyRevenue: monthlyRevenue._sum.totalPrice || 0,
    yearlyRevenue: yearlyRevenue._sum.totalPrice || 0,
    bookingsByCourt: bookingsByCourt.map((b) => ({
      court: courtMap.get(b.courtId) || "Unknown",
      count: b._count.id,
      revenue: Number(b._sum.totalPrice || 0),
    })),
    bookingsByStatus: bookingsByStatus.map((b) => ({
      status: b.status,
      count: b._count.id,
    })),
  };
}

export default async function AdminReportsPage() {
  const data = await getReportData();

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-text">Laporan & Analitik</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="card-custom">
          <CardContent className="p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Total Booking</h3>
            <p className="text-3xl font-bold text-text">{data.totalBookings}</p>
          </CardContent>
        </Card>
        <Card className="card-custom">
          <CardContent className="p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Pendapatan Bulan Ini</h3>
            <p className="text-3xl font-bold text-green-600">
              Rp {Number(data.monthlyRevenue).toLocaleString("id-ID")}
            </p>
          </CardContent>
        </Card>
        <Card className="card-custom">
          <CardContent className="p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Pendapatan Tahun Ini</h3>
            <p className="text-3xl font-bold text-blue-600">
              Rp {Number(data.yearlyRevenue).toLocaleString("id-ID")}
            </p>
          </CardContent>
        </Card>
        <Card className="card-custom">
          <CardContent className="p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Total Pendapatan</h3>
            <p className="text-3xl font-bold text-text">
              Rp {Number(data.totalRevenue).toLocaleString("id-ID")}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="card-custom">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Booking per Lapangan</h3>
            <div className="space-y-3">
              {data.bookingsByCourt.map((c) => (
                <div key={c.court} className="flex justify-between items-center py-2 border-b last:border-0">
                  <span className="font-medium">{c.court}</span>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{c.count} booking</p>
                    <p className="text-xs text-gray-500">Rp {c.revenue.toLocaleString("id-ID")}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="card-custom">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Booking per Status</h3>
            <div className="space-y-3">
              {data.bookingsByStatus.map((s) => (
                <div key={s.status} className="flex justify-between items-center py-2 border-b last:border-0">
                  <span className="capitalize font-medium">{s.status.replace(/_/g, " ")}</span>
                  <span className="text-sm font-semibold text-primary">{s.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}