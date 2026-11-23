import Link from "next/link";
import type { Metadata } from "next";

import { prisma } from "@/server/db/prisma";
import { getPricePerHour } from "@/features/booking/server/availability.service";
import { CourtDatePicker } from "@/features/booking/components/court-date-picker";
import { formatCurrency } from "@/shared/lib/format";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Daftar Lapangan",
  description: "Tiga lapangan indoor standar BWF dengan tarif per jam yang transparan.",
};

export default async function CourtsPage() {
  const [courts, pricePerHour] = await Promise.all([
    prisma.court.findMany({ orderBy: { id: "asc" } }),
    getPricePerHour(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
      <div className="border-b border-navy pb-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-terracotta">
              Daftar lapangan
            </span>
            <h1 className="mt-1.5 font-display text-2xl font-bold tracking-tight text-navy sm:text-3xl">
              Pilih tanggal, lalu lihat unit
            </h1>
            <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-slate-muted sm:text-sm">
              Tentukan tanggal bermain terlebih dahulu. Ketersediaan per jam ditampilkan pada
              halaman reservasi sesuai tanggal yang Anda pilih.
            </p>
          </div>
          <span className="rounded-[2px] border border-cobalt/40 bg-cobalt/10 px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-cobalt">
            Tarif {formatCurrency(pricePerHour)} / jam
          </span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-5">
          <h2 className="mb-2 font-mono text-[11px] font-bold uppercase tracking-wider text-navy">
            01 / Kalender reservasi
          </h2>
          <CourtDatePicker />
          <p className="mt-2 font-mono text-[11px] uppercase leading-relaxed tracking-wider text-slate-muted">
            Tanggal lampau dinonaktifkan. Reservasi hanya dapat dibuat untuk hari ini dan seterusnya.
          </p>
        </div>

        <div className="lg:col-span-7">
          <div className="mb-2 flex items-end justify-between border-b border-navy/25 pb-2">
            <h2 className="font-mono text-[11px] font-bold uppercase tracking-wider text-navy">
              02 / Daftar lapangan
            </h2>
            <span className="font-mono text-[11px] uppercase tracking-wider text-slate-muted">
              {courts.filter((court) => court.isActive).length} aktif dari {courts.length}
            </span>
          </div>

          <div className="space-y-3">
            {courts.length === 0 ? (
              <div className="rounded-[2px] border border-dashed border-navy/30 bg-paper p-8 text-center">
                <p className="font-mono text-xs font-bold uppercase tracking-wider text-navy">
                  Belum ada lapangan terdaftar
                </p>
                <p className="mt-1 text-xs text-slate-muted">
                  Tambahkan lapangan melalui panel admin untuk mulai menerima reservasi.
                </p>
              </div>
            ) : (
              courts.map((court, index) => (
                <article
                  key={court.id}
                  className="rounded-[2px] border border-navy bg-paper"
                >
                  <header className="flex flex-wrap items-center justify-between gap-2 border-b border-navy bg-birch px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-[11px] font-bold text-navy/50">
                        {(index + 1).toString().padStart(2, "0")}
                      </span>
                      <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-navy sm:text-sm">
                        {court.name}
                      </h3>
                    </div>
                    <span
                      className={cn(
                        "rounded-[2px] border px-1.5 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider",
                        court.isActive
                          ? "border-cobalt/40 bg-cobalt/10 text-cobalt"
                          : "border-navy/25 bg-chalk text-slate-muted"
                      )}
                    >
                      {court.isActive ? "Aktif" : "Nonaktif"}
                    </span>
                  </header>

                  <div className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-end">
                    <div className="min-w-0">
                      <p className="text-xs leading-relaxed text-slate-muted">
                        {court.description ?? "Lapangan indoor standar BWF dengan sub-lantai pegas."}
                      </p>
                      <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[11px] uppercase tracking-wider">
                        <div>
                          <dt className="text-slate-muted">Matras</dt>
                          <dd className="mt-0.5 font-semibold text-navy">Vinyl BWF 7.0 mm</dd>
                        </div>
                        <div>
                          <dt className="text-slate-muted">Pencahayaan</dt>
                          <dd className="mt-0.5 font-semibold text-navy">800 lux</dd>
                        </div>
                        <div>
                          <dt className="text-slate-muted">Kapasitas</dt>
                          <dd className="mt-0.5 font-semibold text-navy">8 pemain</dd>
                        </div>
                      </dl>
                    </div>

                    <div className="flex shrink-0 items-center justify-between gap-4 sm:flex-col sm:items-end">
                      <span className="font-mono text-sm font-bold text-navy">
                        {formatCurrency(pricePerHour)}
                        <span className="ml-1 text-[11px] font-semibold uppercase text-slate-muted">
                          /jam
                        </span>
                      </span>
                      <Link
                        href="/booking"
                        className="rounded-[2px] border border-navy bg-navy px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-wider text-paper transition-colors hover:border-terracotta hover:bg-terracotta"
                      >
                        Cek jadwal
                      </Link>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>

          <div className="mt-4 rounded-[2px] border border-navy/25 bg-birch px-4 py-3">
            <p className="font-mono text-[11px] uppercase leading-relaxed tracking-wide text-slate-muted">
              Tarif seragam ditetapkan pengelola melalui konfigurasi harga per jam dan dihitung ulang
              di server pada saat reservasi dibuat.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
