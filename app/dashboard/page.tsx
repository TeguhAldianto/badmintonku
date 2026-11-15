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
      <div className="border-b border-[#141824] pb-4">
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#C84B31]">
          Ringkasan / Lembar 04
        </span>
        <h1 className="mt-1.5 font-display text-2xl font-bold tracking-tight text-[#141824] sm:text-3xl">
          {session?.user?.name ? `Selamat datang, ${session.user.name}` : "Pusat aktivitas pemain"}
        </h1>
        <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-[#6E6A61] sm:text-sm">
          Halaman ini merangkum akses cepat ke reservasi, tiket, dan daftar lapangan. Reservasi tamu
          tidak terikat akun, sehingga tiket disimpan pada perangkat yang Anda gunakan.
        </p>
      </div>

      <div className="mt-6 grid gap-px border border-[#141824] bg-[#141824]/30 sm:grid-cols-3">
        {ENTRIES.map((entry) => {
          const Icon = entry.icon;
          return (
            <Link
              key={entry.href}
              href={entry.href}
              className="group flex flex-col justify-between bg-[#FAF9F6] p-4 transition-colors hover:bg-[#EAE6DD]"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="flex h-8 w-8 items-center justify-center rounded-[2px] border border-[#141824]/30 bg-[#F5F3EE] text-[#141824]">
                    <Icon className="h-4 w-4" strokeWidth={1.5} />
                  </span>
                  <span className="font-mono text-[10px] font-bold tracking-wider text-[#141824]/40">
                    {entry.code}
                  </span>
                </div>
                <h2 className="mt-3 font-display text-sm font-bold text-[#141824]">{entry.title}</h2>
                <p className="mt-1 text-[11px] leading-relaxed text-[#6E6A61]">{entry.body}</p>
              </div>
              <span className="mt-4 inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[#141824] group-hover:text-[#C84B31]">
                Buka
                <ArrowRight className="h-3 w-3" strokeWidth={2} />
              </span>
            </Link>
          );
        })}
      </div>

      {isAdmin ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[2px] border border-[#1E3A8A]/50 bg-[#1E3A8A]/10 px-4 py-3">
          <div>
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#1E3A8A]">
              Sesi administrator aktif
            </span>
            <p className="mt-0.5 text-xs text-[#1E3A8A]/90">
              Anda dapat membuka panel pengelola untuk verifikasi pembayaran dan laporan.
            </p>
          </div>
          <Link
            href="/admin/dashboard"
            className="rounded-[2px] border border-[#1E3A8A] bg-[#1E3A8A] px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-[#FAF9F6] transition-colors hover:bg-[#141824] hover:border-[#141824]"
          >
            Panel admin
          </Link>
        </div>
      ) : null}
    </div>
  );
}
