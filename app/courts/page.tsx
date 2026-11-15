import Link from "next/link";

import { prisma } from "@/server/db/prisma";
import { getPricePerHour } from "@/features/booking/server/availability.service";
import { CourtDatePicker } from "@/features/booking/components/court-date-picker";
import { formatCurrency } from "@/shared/lib/format";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CourtsPage() {
  const [courts, pricePerHour] = await Promise.all([
    prisma.court.findMany({ orderBy: { id: "asc" } }),
    getPricePerHour(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
      <div className="border-b border-[#141824] pb-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#C84B31]">
              Lapangan / Lembar 02
            </span>
            <h1 className="mt-1.5 font-display text-2xl font-bold tracking-tight text-[#141824] sm:text-3xl">
              Pilih tanggal, lalu lihat unit
            </h1>
            <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-[#6E6A61] sm:text-sm">
              Tentukan tanggal bermain terlebih dahulu. Ketersediaan per jam ditampilkan pada
              halaman reservasi sesuai tanggal yang Anda pilih.
            </p>
          </div>
          <span className="rounded-[2px] border border-[#1E3A8A]/40 bg-[#1E3A8A]/10 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-[#1E3A8A]">
            Tarif {formatCurrency(pricePerHour)} / jam
          </span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-5">
          <h2 className="mb-2 font-mono text-[11px] font-bold uppercase tracking-wider text-[#141824]">
            01 / Kalender reservasi
          </h2>
          <CourtDatePicker />
          <p className="mt-2 font-mono text-[10px] uppercase leading-relaxed tracking-wider text-[#6E6A61]">
            Tanggal lampau dinonaktifkan. Reservasi hanya dapat dibuat untuk hari ini dan seterusnya.
          </p>
        </div>

        <div className="lg:col-span-7">
          <div className="mb-2 flex items-end justify-between border-b border-[#141824]/25 pb-2">
            <h2 className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#141824]">
              02 / Daftar lapangan
            </h2>
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#6E6A61]">
              {courts.filter((court) => court.isActive).length} aktif dari {courts.length}
            </span>
          </div>

          <div className="space-y-3">
            {courts.length === 0 ? (
              <div className="rounded-[2px] border border-dashed border-[#141824]/30 bg-[#FAF9F6] p-8 text-center">
                <p className="font-mono text-xs font-bold uppercase tracking-wider text-[#141824]">
                  Belum ada lapangan terdaftar
                </p>
                <p className="mt-1 text-xs text-[#6E6A61]">
                  Tambahkan lapangan melalui panel admin untuk mulai menerima reservasi.
                </p>
              </div>
            ) : (
              courts.map((court, index) => (
                <article
                  key={court.id}
                  className="rounded-[2px] border border-[#141824] bg-[#FAF9F6]"
                >
                  <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[#141824] bg-[#EAE6DD] px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-[10px] font-bold text-[#141824]/50">
                        {(index + 1).toString().padStart(2, "0")}
                      </span>
                      <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#141824] sm:text-sm">
                        {court.name}
                      </h3>
                    </div>
                    <span
                      className={cn(
                        "rounded-[2px] border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider",
                        court.isActive
                          ? "border-[#1E3A8A]/40 bg-[#1E3A8A]/10 text-[#1E3A8A]"
                          : "border-[#141824]/25 bg-[#F5F3EE] text-[#6E6A61]"
                      )}
                    >
                      {court.isActive ? "Aktif" : "Nonaktif"}
                    </span>
                  </header>

                  <div className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-end">
                    <div className="min-w-0">
                      <p className="text-xs leading-relaxed text-[#6E6A61]">
                        {court.description ?? "Lapangan indoor standar BWF dengan sub-lantai pegas."}
                      </p>
                      <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[10px] uppercase tracking-wider">
                        <div>
                          <dt className="text-[#6E6A61]">Matras</dt>
                          <dd className="mt-0.5 font-semibold text-[#141824]">Vinyl BWF 7.0 mm</dd>
                        </div>
                        <div>
                          <dt className="text-[#6E6A61]">Pencahayaan</dt>
                          <dd className="mt-0.5 font-semibold text-[#141824]">800 lux</dd>
                        </div>
                        <div>
                          <dt className="text-[#6E6A61]">Kapasitas</dt>
                          <dd className="mt-0.5 font-semibold text-[#141824]">8 pemain</dd>
                        </div>
                      </dl>
                    </div>

                    <div className="flex shrink-0 items-center justify-between gap-4 sm:flex-col sm:items-end">
                      <span className="font-mono text-sm font-bold text-[#141824]">
                        {formatCurrency(pricePerHour)}
                        <span className="ml-1 text-[10px] font-semibold uppercase text-[#6E6A61]">
                          /jam
                        </span>
                      </span>
                      <Link
                        href="/booking"
                        className="rounded-[2px] border border-[#141824] bg-[#141824] px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-[#FAF9F6] transition-colors hover:border-[#C84B31] hover:bg-[#C84B31]"
                      >
                        Cek jadwal
                      </Link>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>

          <div className="mt-4 rounded-[2px] border border-[#141824]/25 bg-[#EAE6DD] px-4 py-3">
            <p className="font-mono text-[10px] uppercase leading-relaxed tracking-wide text-[#6E6A61]">
              Tarif seragam ditetapkan pengelola melalui konfigurasi harga per jam dan dihitung ulang
              di server pada saat reservasi dibuat.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
