import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { TicketList } from "@/features/booking/components/ticket-list";

export default function BookingsHistoryPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#141824] pb-4">
        <div>
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#C84B31]">
            Tiket saya / Lembar 03
          </span>
          <h1 className="mt-1.5 font-display text-2xl font-bold tracking-tight text-[#141824] sm:text-3xl">
            Daftar reservasi tersimpan
          </h1>
          <p className="mt-1.5 max-w-xl text-xs leading-relaxed text-[#6E6A61] sm:text-sm">
            Semua tiket yang dibuat dari perangkat ini. Buka e-tiket untuk ditunjukkan di resepsionis,
            atau lanjutkan ke halaman status untuk membayar.
          </p>
        </div>
        <Link
          href="/booking"
          className="inline-flex items-center gap-2 rounded-[2px] border border-[#141824] bg-[#141824] px-3.5 py-2.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[#FAF9F6] transition-colors hover:border-[#C84B31] hover:bg-[#C84B31]"
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
