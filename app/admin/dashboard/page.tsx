import Link from "next/link";

import { getDashboardStats } from "@/features/admin/server/queries";
import { StatusBadge } from "@/shared/components/status-badge";
import { formatCurrency, formatDateIndo } from "@/shared/lib/format";

export default async function AdminDashboard() {
  const stats = await getDashboardStats();

  const cards = [
    { label: "Booking hari ini", value: stats.bookingsToday, accent: "bg-navy" },
    { label: "Total booking", value: stats.totalBookings, accent: "bg-navy" },
    { label: "Menunggu verifikasi", value: stats.pending, accent: "bg-terracotta" },
    { label: "Dikonfirmasi", value: stats.confirmed, accent: "bg-cobalt" },
    { label: "Selesai", value: stats.completed, accent: "bg-cobalt" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-navy pb-3">
        <div>
          <span className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-terracotta">
            Ringkasan operasional
          </span>
          <h1 className="mt-1 font-display text-xl font-bold tracking-tight sm:text-2xl">
            Dashboard Admin
          </h1>
        </div>
        <span className="font-mono text-[11px] uppercase tracking-wider text-slate-muted">
          Data langsung dari basis data arena
        </span>
      </div>

      <div className="flex flex-wrap gap-px border border-navy bg-navy/30">
        {cards.map((card) => (
          <div
            key={card.label}
            className="relative flex-1 basis-[calc(50%-1px)] bg-paper p-4 lg:basis-0"
          >
            <span className={`absolute inset-y-0 left-0 w-[3px] ${card.accent}`} aria-hidden="true" />
            <h2 className="font-mono text-[11px] uppercase tracking-wider text-slate-muted">
              {card.label}
            </h2>
            <p className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-navy">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border border-navy bg-birch px-4 py-3.5">
        <div>
          <h2 className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-muted">
            Total pendapatan (dikonfirmasi + selesai)
          </h2>
          <p className="mt-1 font-mono text-xl font-bold tabular-nums text-navy sm:text-2xl">
            {formatCurrency(stats.revenue)}
          </p>
        </div>
        <Link
          href="/admin/reports"
          className="rounded-[2px] border border-navy bg-paper px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-wider text-navy transition-colors hover:bg-navy hover:text-paper"
        >
          Buka laporan
        </Link>
      </div>

      <section className="border border-navy bg-paper">
        <header className="flex items-center justify-between border-b border-navy bg-birch px-4 py-2.5">
          <h2 className="font-mono text-[11px] font-bold uppercase tracking-wider text-navy">
            Booking terbaru
          </h2>
          <Link
            href="/admin/bookings"
            className="font-mono text-[11px] font-bold uppercase tracking-wider text-cobalt hover:underline"
          >
            Lihat semua
          </Link>
        </header>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-navy/25 bg-chalk">
                {["Kode", "Pemesan", "Lapangan", "Tanggal", "Status", "Harga"].map((header) => (
                  <th
                    key={header}
                    className="whitespace-nowrap px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-wider text-slate-muted"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.recentBookings.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-10 text-center font-mono text-[11px] uppercase tracking-wider text-slate-muted"
                  >
                    Belum ada booking tercatat
                  </td>
                </tr>
              ) : (
                stats.recentBookings.map((booking) => (
                  <tr
                    key={booking.id}
                    className="border-b border-navy/10 last:border-0 hover:bg-birch/50"
                  >
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px] text-navy">
                      {booking.id.slice(0, 8)}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-navy">
                      <span className="block font-semibold">{booking.userName}</span>
                      <span className="font-mono text-[11px] text-slate-muted">
                        {booking.userPhone}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-xs text-navy">
                      {booking.court.name}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px] text-slate-muted">
                      {formatDateIndo(booking.date)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <StatusBadge status={booking.status} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px] font-semibold tabular-nums text-navy">
                      {formatCurrency(Number(booking.totalPrice))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
