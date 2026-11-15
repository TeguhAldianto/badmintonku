import Link from "next/link";

import { getDashboardStats } from "@/features/admin/server/queries";
import { StatusBadge } from "@/shared/components/status-badge";
import { formatCurrency, formatDateIndo } from "@/shared/lib/format";

export default async function AdminDashboard() {
  const stats = await getDashboardStats();

  const cards = [
    { label: "Booking hari ini", value: stats.bookingsToday, accent: "bg-[#141824]" },
    { label: "Total booking", value: stats.totalBookings, accent: "bg-[#141824]" },
    { label: "Menunggu verifikasi", value: stats.pending, accent: "bg-[#C84B31]" },
    { label: "Dikonfirmasi", value: stats.confirmed, accent: "bg-[#1E3A8A]" },
    { label: "Selesai", value: stats.completed, accent: "bg-[#1E3A8A]" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#141824] pb-3">
        <div>
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#C84B31]">
            Ringkasan operasional
          </span>
          <h1 className="mt-1 font-display text-xl font-bold tracking-tight sm:text-2xl">
            Dashboard Admin
          </h1>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-[#6E6A61]">
          Data langsung dari basis data arena
        </span>
      </div>

      <div className="flex flex-wrap gap-px border border-[#141824] bg-[#141824]/30">
        {cards.map((card) => (
          <div
            key={card.label}
            className="relative flex-1 basis-[calc(50%-1px)] bg-[#FAF9F6] p-4 lg:basis-0"
          >
            <span className={`absolute inset-y-0 left-0 w-[3px] ${card.accent}`} aria-hidden="true" />
            <h2 className="font-mono text-[10px] uppercase tracking-wider text-[#6E6A61]">
              {card.label}
            </h2>
            <p className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-[#141824]">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border border-[#141824] bg-[#EAE6DD] px-4 py-3.5">
        <div>
          <h2 className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#6E6A61]">
            Total pendapatan (dikonfirmasi + selesai)
          </h2>
          <p className="mt-1 font-mono text-xl font-bold tabular-nums text-[#141824] sm:text-2xl">
            {formatCurrency(stats.revenue)}
          </p>
        </div>
        <Link
          href="/admin/reports"
          className="rounded-[2px] border border-[#141824] bg-[#FAF9F6] px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-[#141824] transition-colors hover:bg-[#141824] hover:text-[#FAF9F6]"
        >
          Buka laporan
        </Link>
      </div>

      <section className="border border-[#141824] bg-[#FAF9F6]">
        <header className="flex items-center justify-between border-b border-[#141824] bg-[#EAE6DD] px-4 py-2.5">
          <h2 className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#141824]">
            Booking terbaru
          </h2>
          <Link
            href="/admin/bookings"
            className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#1E3A8A] hover:underline"
          >
            Lihat semua
          </Link>
        </header>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[#141824]/25 bg-[#F5F3EE]">
                {["Kode", "Pemesan", "Lapangan", "Tanggal", "Status", "Harga"].map((header) => (
                  <th
                    key={header}
                    className="whitespace-nowrap px-3 py-2 font-mono text-[9px] font-bold uppercase tracking-wider text-[#6E6A61]"
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
                    className="px-3 py-10 text-center font-mono text-[11px] uppercase tracking-wider text-[#6E6A61]"
                  >
                    Belum ada booking tercatat
                  </td>
                </tr>
              ) : (
                stats.recentBookings.map((booking) => (
                  <tr
                    key={booking.id}
                    className="border-b border-[#141824]/10 last:border-0 hover:bg-[#EAE6DD]/50"
                  >
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px] text-[#141824]">
                      {booking.id.slice(0, 8)}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-[#141824]">
                      <span className="block font-semibold">{booking.userName}</span>
                      <span className="font-mono text-[10px] text-[#6E6A61]">
                        {booking.userPhone}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-xs text-[#141824]">
                      {booking.court.name}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[10px] text-[#6E6A61]">
                      {formatDateIndo(booking.date)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <StatusBadge status={booking.status} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px] font-semibold tabular-nums text-[#141824]">
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
