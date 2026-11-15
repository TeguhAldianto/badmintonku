import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";

import { prisma } from "@/server/db/prisma";
import { getPricePerHour } from "@/features/booking/server/availability.service";
import { FloorplanShowcase } from "@/features/booking/components/floorplan-showcase";
import { formatCurrency } from "@/shared/lib/format";

export const dynamic = "force-dynamic";

const SPECS = [
  {
    code: "A.01",
    label: "Plafon bebas",
    value: "14.0 M",
    note: "Tanpa balok penghalang lintasan shuttlecock.",
  },
  {
    code: "A.02",
    label: "Pencahayaan",
    value: "800 LUX",
    note: "Side-LED anti-silau, CRI di atas 90.",
  },
  {
    code: "A.03",
    label: "Sub-lantai",
    value: "BWF PRO",
    note: "Konstruksi pegas kayu penyerap benturan sendi.",
  },
  {
    code: "A.04",
    label: "Zona tunggu",
    value: "3 AREA",
    note: "Bangku pemain, lounge, dan ruang bilas terpisah.",
  },
];

const FACILITIES = [
  "Lantai vinyl standar BWF 7.0 mm dengan garis resmi turnamen.",
  "Jaring dan tiang bersertifikasi dengan tegangan tetap setiap pagi.",
  "Ruang ganti, shower air panas, dan loker berpengunci.",
  "Area parkir dalam gedung untuk mobil dan motor.",
  "Kantin ringan, isi ulang air minum, dan penyewaan raket karbon.",
  "Pencahayaan darurat serta jalur evakuasi bertanda jelas.",
];

const STEPS = [
  {
    step: "01",
    title: "Cek ketersediaan",
    body: "Matriks jadwal menampilkan slot per jam untuk setiap lapangan, langsung dari basis data arena.",
  },
  {
    step: "02",
    title: "Kunci slot",
    body: "Pilih jam main, isi nama dan nomor WhatsApp. Slot berurutan otomatis digabung jadi satu reservasi.",
  },
  {
    step: "03",
    title: "Bayar & masuk",
    body: "Selesaikan pembayaran Midtrans atau unggah bukti transfer. E-tiket terbit setelah verifikasi.",
  },
];

export default async function HomePage() {
  const [courts, pricePerHour] = await Promise.all([
    prisma.court.findMany({ orderBy: { id: "asc" } }),
    getPricePerHour(),
  ]);

  const activeCourts = courts.filter((court) => court.isActive).length;
  const floorplanCourts = courts.map((court) => ({
    id: court.id,
    name: court.name,
    description: court.description,
    isActive: court.isActive,
    pricePerHour,
  }));

  return (
    <div>
      {/* HERO */}
      <section className="border-b border-[#141824]">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-10 sm:px-6 lg:grid-cols-12 lg:gap-10 lg:px-8 lg:py-16">
          <div className="flex flex-col justify-between lg:col-span-5">
            <div>
              <div className="inline-flex items-center gap-2 rounded-[2px] border border-[#141824]/25 bg-[#EAE6DD] px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#141824]">
                <span className="inline-block h-1.5 w-1.5 bg-[#C84B31]" />
                Arena bulutangkis · Jakarta Selatan
              </div>

              <h1 className="mt-5 font-display text-3xl font-bold leading-[1.06] tracking-tight text-[#141824] sm:text-4xl lg:text-[46px]">
                Ruang main dengan presisi arsitektural.
              </h1>

              <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#6E6A61] sm:text-[15px]">
                Tiga lapangan indoor standar turnamen di dalam satu hall dengan plafon bebas 14
                meter, pencahayaan samping anti-silau, dan sub-lantai pegas. Reservasi dihitung
                langsung dari ketersediaan nyata — tanpa telepon, tanpa antre.
              </p>

              <div className="mt-6 grid grid-cols-3 divide-x divide-[#141824]/25 border border-[#141824]/25 bg-[#FAF9F6]">
                <div className="p-3">
                  <span className="block font-mono text-[9px] uppercase tracking-wider text-[#6E6A61]">
                    Lapangan
                  </span>
                  <span className="mt-0.5 block font-display text-lg font-bold text-[#141824]">
                    {activeCourts.toString().padStart(2, "0")} / {courts.length.toString().padStart(2, "0")}
                  </span>
                </div>
                <div className="p-3">
                  <span className="block font-mono text-[9px] uppercase tracking-wider text-[#6E6A61]">
                    Tarif / jam
                  </span>
                  <span className="mt-0.5 block font-mono text-sm font-bold text-[#1E3A8A]">
                    {formatCurrency(pricePerHour)}
                  </span>
                </div>
                <div className="p-3">
                  <span className="block font-mono text-[9px] uppercase tracking-wider text-[#6E6A61]">
                    Jam buka
                  </span>
                  <span className="mt-0.5 block font-mono text-sm font-bold text-[#141824]">
                    08—21
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/booking"
                className="inline-flex items-center gap-3 rounded-[2px] border border-[#141824] bg-[#C84B31] px-6 py-3.5 font-mono text-xs font-bold uppercase tracking-wider text-[#FAF9F6] transition-colors hover:bg-[#141824]"
              >
                Reservasi lapangan
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
              </Link>
              <Link
                href="/courts"
                className="inline-flex items-center gap-2 rounded-[2px] border border-[#141824]/30 bg-[#FAF9F6] px-5 py-3.5 font-mono text-xs font-bold uppercase tracking-wider text-[#141824] transition-colors hover:border-[#141824] hover:bg-[#EAE6DD]"
              >
                Lihat lapangan
                <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2} />
              </Link>
            </div>
          </div>

          <div className="lg:col-span-7">
            <FloorplanShowcase courts={floorplanCourts} />
            <p className="mt-2 font-mono text-[10px] uppercase leading-relaxed tracking-wider text-[#6E6A61]">
              Denah berskala · klik unit untuk melihat spesifikasi matras dan status operasional.
            </p>
          </div>
        </div>
      </section>

      {/* SPECIFICATIONS */}
      <section className="border-b border-[#141824]/20">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#141824]/25 pb-3">
            <h2 className="font-display text-xl font-bold tracking-tight text-[#141824] sm:text-2xl">
              Spesifikasi bangunan
            </h2>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#6E6A61]">
              Lembar A — Data teknis
            </span>
          </div>

          <dl className="mt-4 grid gap-px border border-[#141824] bg-[#141824]/30 sm:grid-cols-2 lg:grid-cols-4">
            {SPECS.map((spec) => (
              <div key={spec.code} className="bg-[#FAF9F6] p-4">
                <dt className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-[#6E6A61]">
                  <span>{spec.label}</span>
                  <span className="text-[#141824]/40">{spec.code}</span>
                </dt>
                <dd className="mt-2 font-display text-2xl font-bold tracking-tight text-[#141824]">
                  {spec.value}
                </dd>
                <p className="mt-1.5 text-[11px] leading-relaxed text-[#6E6A61]">{spec.note}</p>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* FACILITIES + STEPS */}
      <section>
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-10 sm:px-6 lg:grid-cols-12 lg:px-8 lg:py-14">
          <div className="lg:col-span-7">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#141824]/25 pb-3">
              <h2 className="font-display text-xl font-bold tracking-tight text-[#141824] sm:text-2xl">
                Fasilitas arena
              </h2>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#6E6A61]">
                Lembar B — Inventaris
              </span>
            </div>

            <ul className="mt-4 divide-y divide-[#141824]/15 border-y border-[#141824]/25">
              {FACILITIES.map((facility, index) => (
                <li key={facility} className="flex gap-4 py-3">
                  <span className="w-8 shrink-0 font-mono text-[10px] font-bold text-[#C84B31]">
                    {(index + 1).toString().padStart(2, "0")}
                  </span>
                  <span className="text-xs leading-relaxed text-[#141824] sm:text-sm">
                    {facility}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-5">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#141824]/25 pb-3">
              <h2 className="font-display text-xl font-bold tracking-tight text-[#141824] sm:text-2xl">
                Cara reservasi
              </h2>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#6E6A61]">
                Lembar C — Prosedur
              </span>
            </div>

            <ol className="mt-4 space-y-3">
              {STEPS.map((item) => (
                <li
                  key={item.step}
                  className="rounded-[2px] border border-[#141824]/25 bg-[#FAF9F6] p-4"
                >
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#C84B31]">
                    Langkah {item.step}
                  </span>
                  <h3 className="mt-1 font-display text-base font-bold text-[#141824]">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-[11px] leading-relaxed text-[#6E6A61] sm:text-xs">
                    {item.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-y border-[#141824] bg-[#141824] text-[#FAF9F6]">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-10 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8 lg:py-12">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#C84B31]">
              Slot terbatas per jam
            </span>
            <h2 className="mt-1.5 max-w-xl font-display text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
              Amankan jam main Anda sebelum diambil pemain lain.
            </h2>
            <p className="mt-2 max-w-xl text-xs leading-relaxed text-[#EAE6DD]/70 sm:text-sm">
              Ketersediaan diperbarui setiap kali halaman dimuat. Slot yang belum dibayar dilepas
              otomatis setelah 60 menit.
            </p>
          </div>
          <Link
            href="/booking"
            className="inline-flex shrink-0 items-center justify-center gap-3 rounded-[2px] border border-[#FAF9F6] bg-[#C84B31] px-6 py-3.5 font-mono text-xs font-bold uppercase tracking-wider text-[#FAF9F6] transition-colors hover:bg-[#FAF9F6] hover:text-[#141824]"
          >
            Mulai reservasi
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
          </Link>
        </div>
      </section>
    </div>
  );
}
