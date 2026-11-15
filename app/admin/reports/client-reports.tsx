"use client";

import dynamic from "next/dynamic";

import { StatusBadge } from "@/shared/components/status-badge";
import { formatCurrency } from "@/shared/lib/format";

const Chart = dynamic(() => import("@/features/admin/components/ReportCharts"), { ssr: false });

interface ReportsData {
  totalBookings: number;
  totalRevenue: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  bookingsByCourt: Array<{ court: string; count: number; revenue: number }>;
  bookingsByStatus: Array<{ status: string; count: number }>;
  busiestHours: Array<{ hour: string; count: number }>;
}

export default function ClientReportsPage({ data }: { data: ReportsData }) {
  const summary = [
    { label: "Total booking", value: data.totalBookings.toString(), accent: "border-[#141824]" },
    {
      label: "Pendapatan bulan ini",
      value: formatCurrency(data.monthlyRevenue),
      accent: "border-[#1E3A8A]",
    },
    {
      label: "Pendapatan tahun ini",
      value: formatCurrency(data.yearlyRevenue),
      accent: "border-[#1E3A8A]",
    },
    {
      label: "Total pendapatan",
      value: formatCurrency(data.totalRevenue),
      accent: "border-[#C84B31]",
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#141824] pb-3">
        <div>
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#C84B31]">
            Modul 07
          </span>
          <h1 className="mt-1 font-display text-xl font-bold tracking-tight sm:text-2xl">
            Laporan &amp; Analitik
          </h1>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-[#6E6A61]">
          Pendapatan dihitung dari booking dikonfirmasi &amp; selesai
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summary.map((item) => (
          <div
            key={item.label}
            className={`border border-[#141824]/25 border-l-[3px] ${item.accent} bg-[#FAF9F6] p-4`}
          >
            <h2 className="font-mono text-[10px] uppercase tracking-wider text-[#6E6A61]">
              {item.label}
            </h2>
            <p className="mt-1.5 font-mono text-lg font-bold tabular-nums text-[#141824]">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <Chart data={data.busiestHours} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="border border-[#141824] bg-[#FAF9F6]">
          <header className="border-b border-[#141824] bg-[#EAE6DD] px-4 py-2.5">
            <h2 className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#141824]">
              Booking per lapangan
            </h2>
          </header>
          <ul className="divide-y divide-[#141824]/15">
            {data.bookingsByCourt.length === 0 ? (
              <li className="px-4 py-8 text-center font-mono text-[10px] uppercase tracking-wider text-[#6E6A61]">
                Belum ada data
              </li>
            ) : (
              data.bookingsByCourt.map((court) => (
                <li
                  key={court.court}
                  className="flex items-center justify-between gap-3 px-4 py-2.5"
                >
                  <span className="text-xs font-semibold text-[#141824]">{court.court}</span>
                  <span className="text-right">
                    <span className="block font-mono text-[11px] font-bold tabular-nums text-[#141824]">
                      {court.count} booking
                    </span>
                    <span className="block font-mono text-[10px] tabular-nums text-[#6E6A61]">
                      {formatCurrency(court.revenue)}
                    </span>
                  </span>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="border border-[#141824] bg-[#FAF9F6]">
          <header className="border-b border-[#141824] bg-[#EAE6DD] px-4 py-2.5">
            <h2 className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#141824]">
              Booking per status
            </h2>
          </header>
          <ul className="divide-y divide-[#141824]/15">
            {data.bookingsByStatus.length === 0 ? (
              <li className="px-4 py-8 text-center font-mono text-[10px] uppercase tracking-wider text-[#6E6A61]">
                Belum ada data
              </li>
            ) : (
              data.bookingsByStatus.map((status) => (
                <li
                  key={status.status}
                  className="flex items-center justify-between gap-3 px-4 py-2.5"
                >
                  <StatusBadge status={status.status} />
                  <span className="font-mono text-[11px] font-bold tabular-nums text-[#141824]">
                    {status.count}
                  </span>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      <section className="border border-[#141824] bg-[#FAF9F6]">
        <header className="border-b border-[#141824] bg-[#EAE6DD] px-4 py-2.5">
          <h2 className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#141824]">
            Jam tersibuk (5 teratas)
          </h2>
        </header>
        <ul className="divide-y divide-[#141824]/15">
          {data.busiestHours.length === 0 ? (
            <li className="px-4 py-8 text-center font-mono text-[10px] uppercase tracking-wider text-[#6E6A61]">
              Belum ada data booking
            </li>
          ) : (
            data.busiestHours.map((hour) => (
              <li key={hour.hour} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <span className="font-mono text-[11px] font-semibold tabular-nums text-[#141824]">
                  {hour.hour}
                </span>
                <span className="font-mono text-[11px] font-bold tabular-nums text-[#1E3A8A]">
                  {hour.count} booking
                </span>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
