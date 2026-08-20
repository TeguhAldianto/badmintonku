import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateIndo, formatTimeSlot } from "@/lib/booking";

async function getDashboardStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    bookingsToday,
    totalBookings,
    pending,
    confirmed,
    completed,
    revenue,
    recentBookings,
  ] = await Promise.all([
    prisma.booking.count({
      where: { date: { gte: today, lt: tomorrow } },
    }),
    prisma.booking.count(),
    prisma.booking.count({ where: { status: "WAITING_VERIFICATION" } }),
    prisma.booking.count({ where: { status: "CONFIRMED" } }),
    prisma.booking.count({ where: { status: "COMPLETED" } }),
    prisma.booking.aggregate({
      where: { status: "CONFIRMED" },
      _sum: { totalPrice: true },
    }),
    prisma.booking.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { court: true, payment: true },
    }),
  ]);

  return {
    bookingsToday,
    totalBookings,
    pending,
    confirmed,
    completed,
    revenue: revenue._sum.totalPrice || 0,
    recentBookings,
  };
}

export default async function AdminDashboard() {
  const stats = await getDashboardStats();

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-text">Dashboard Admin</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card className="card-custom">
          <CardContent className="p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Booking Hari Ini</h3>
            <p className="text-3xl font-bold text-primary">{stats.bookingsToday}</p>
          </CardContent>
        </Card>
        <Card className="card-custom">
          <CardContent className="p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Total Booking</h3>
            <p className="text-3xl font-bold text-text">{stats.totalBookings}</p>
          </CardContent>
        </Card>
        <Card className="card-custom">
          <CardContent className="p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Menunggu Verifikasi</h3>
            <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card className="card-custom">
          <CardContent className="p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Dikonfirmasi</h3>
            <p className="text-3xl font-bold text-green-600">{stats.confirmed}</p>
          </CardContent>
        </Card>
        <Card className="card-custom">
          <CardContent className="p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Pendapatan</h3>
            <p className="text-3xl font-bold text-text">
              Rp {Number(stats.revenue).toLocaleString("id-ID")}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-xl font-semibold text-text">Booking Terbaru</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kode</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lapangan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jam</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Harga</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {stats.recentBookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    Belum ada booking
                  </td>
                </tr>
              ) : (
                stats.recentBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono text-sm">{b.id.slice(0, 8)}</td>
                    <td className="px-6 py-4">{b.userName} ({b.userPhone})</td>
                    <td className="px-6 py-4">{b.court.name}</td>
                    <td className="px-6 py-4">{formatDateIndo(new Date(b.date))}</td>
                    <td className="px-6 py-4">{formatTimeSlot({ startTime: b.startTime, endTime: b.endTime, status: "BOOKED" })}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        b.status === "PENDING_PAYMENT" ? "bg-gray-100 text-gray-700" :
                        b.status === "WAITING_VERIFICATION" ? "bg-yellow-100 text-yellow-800" :
                        b.status === "CONFIRMED" ? "bg-green-100 text-green-800" :
                        b.status === "COMPLETED" ? "bg-blue-100 text-blue-800" :
                        "bg-red-100 text-red-800"
                      }`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium">
                      Rp {Number(b.totalPrice).toLocaleString("id-ID")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}