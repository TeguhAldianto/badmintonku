import Link from "next/link";
import { ArrowRight, CalendarCheck, ClipboardList, LayoutDashboard } from "lucide-react";

import { auth } from "@/auth";

const ENTRIES = [
  {
    href: "/booking",
    icon: CalendarCheck,
    code: "01",
    title: "Reservasi lapangan",
    body: "Pilih tanggal, lapangan, dan jam main. Ketersediaan tampil langsung dari arena.",
  },
  {
    href: "/bookings",
    icon: ClipboardList,
    code: "02",
    title: "Tiket saya",
    body: "Buka e-tiket, cetak bukti reservasi, dan lanjutkan pembayaran yang tertunda.",
  },
  {
    href: "/courts",
    icon: LayoutDashboard,
    code: "03",
    title: "Daftar lapangan",
    body: "Tinjau spesifikasi tiap unit serta tarif per jam yang berlaku saat ini.",
  },
];

export default async function DashboardPage() {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-6">
      <div className="border-b border-navy pb-4">
        <span className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-terracotta">
          Ringkasan / Lembar 04
        </span>
        <h1 className="mt-1.5 font-display text-2xl font-bold tracking-tight text-navy sm:text-3xl">
          {session?.user?.name ? `Selamat datang, ${session.user.name}` : "Pusat aktivitas pemain"}
        </h1>
        <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-slate-muted sm:text-sm">
          Halaman ini merangkum akses cepat ke reservasi, tiket, dan daftar lapangan. Reservasi tamu
          tidak terikat akun, sehingga tiket disimpan pada perangkat yang Anda gunakan.
        </p>
      </div>

      <div className="mt-6 grid gap-px border border-navy bg-navy/30 sm:grid-cols-3">
        {ENTRIES.map((entry) => {
          const Icon = entry.icon;
          return (
            <Link
              key={entry.href}
              href={entry.href}
              className="group flex flex-col justify-between bg-paper p-4 transition-colors hover:bg-birch"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="flex h-8 w-8 items-center justify-center rounded-[2px] border border-navy/30 bg-chalk text-navy">
                    <Icon className="h-4 w-4" strokeWidth={1.5} />
                  </span>
                  <span className="font-mono text-[11px] font-bold tracking-wider text-navy/40">
                    {entry.code}
                  </span>
                </div>
                <h2 className="mt-3 font-display text-sm font-bold text-navy">{entry.title}</h2>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-muted">{entry.body}</p>
              </div>
              <span className="mt-4 inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-navy group-hover:text-terracotta">
                Buka
                <ArrowRight className="h-3 w-3" strokeWidth={2} />
              </span>
            </Link>
          );
        })}
      </div>

      {isAdmin ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[2px] border border-cobalt/50 bg-cobalt/10 px-4 py-3">
          <div>
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-cobalt">
              Sesi administrator aktif
            </span>
            <p className="mt-0.5 text-xs text-cobalt/90">
              Anda dapat membuka panel pengelola untuk verifikasi pembayaran dan laporan.
            </p>
          </div>
          <Link
            href="/admin/dashboard"
            className="rounded-[2px] border border-cobalt bg-cobalt px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-wider text-paper transition-colors hover:bg-navy hover:border-navy"
          >
            Panel admin
          </Link>
        </div>
      ) : null}
    </div>
  );
}
