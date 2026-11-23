import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";

import { TicketList } from "@/features/booking/components/ticket-list";

export const metadata: Metadata = {
  title: "Tiket Saya",
  description: "Daftar reservasi tersimpan di perangkat ini beserta status pembayarannya.",
};

export default function BookingsHistoryPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-navy pb-4">
        <div>
          <span className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-terracotta">
            Tiket saya
          </span>
          <h1 className="mt-1.5 font-display text-2xl font-bold tracking-tight text-navy sm:text-3xl">
            Daftar reservasi tersimpan
          </h1>
          <p className="mt-1.5 max-w-xl text-xs leading-relaxed text-slate-muted sm:text-sm">
            Semua tiket yang dibuat dari perangkat ini. Buka e-tiket untuk ditunjukkan di resepsionis,
            atau lanjutkan ke halaman status untuk membayar. Tiket yang hilang dapat dipulihkan
            dengan kode booking atau nomor WhatsApp yang dipakai saat reservasi.
          </p>
        </div>
        <Link
          href="/booking"
          className="inline-flex items-center gap-2 rounded-[2px] border border-navy bg-navy px-3.5 py-2.5 font-mono text-[11px] font-bold uppercase tracking-wider text-paper transition-colors hover:border-terracotta hover:bg-terracotta"
        >
          Reservasi baru
          <ArrowRight className="h-3 w-3" strokeWidth={2} />
        </Link>
      </div>

      <div className="mt-6">
        <TicketList />
      </div>
    </div>
  );
}
