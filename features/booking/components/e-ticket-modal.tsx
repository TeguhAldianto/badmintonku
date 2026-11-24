"use client";

import { Copy, X } from "lucide-react";
import { toast } from "sonner";

import { formatCurrency, formatDateIndo, formatTimeSlot } from "@/shared/lib/format";
import { StatusBadge } from "@/shared/components/status-badge";
import { useDialog } from "@/shared/lib/use-dialog";

export interface ETicketData {
  code: string;
  courtName: string;
  date: string;
  startTime: number;
  endTime: number;
  totalPrice: number;
  userName: string;
  userPhone: string;
  status: string;
}

export function ETicketModal({
  tickets,
  notice,
  onClose,
}: {
  tickets: ETicketData[];
  notice?: string | null;
  onClose: () => void;
}) {
  const dialogRef = useDialog<HTMLDivElement>(onClose, tickets.length > 0);

  if (tickets.length === 0) return null;

  const headingId = `e-ticket-heading-${tickets[0].code.slice(0, 8)}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy/70 p-4 print:static print:block print:overflow-visible print:bg-white print:p-0"
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="my-auto w-full max-w-md space-y-3 print:my-0 print:max-w-none print:space-y-0"
      >
        {notice ? (
          <p className="rounded-[2px] border border-terracotta bg-terracotta/10 px-3 py-2 font-mono text-[11px] uppercase leading-relaxed tracking-wide text-terracotta print:hidden">
            {notice}
          </p>
        ) : null}

        {tickets.map((ticket, index) => {
          const ticketHeadingId = index === 0 ? headingId : `${headingId}-${index}`;
          return (
            <div
              key={ticket.code}
              className="print-ticket overflow-hidden rounded-[2px] border-2 border-navy bg-paper print:mb-3 print:break-inside-avoid"
              id={`printable-ticket-${ticket.code.slice(0, 8)}`}
            >
              <div className="flex items-start justify-between gap-3 bg-navy px-5 py-4 text-paper">
                <div>
                  <span className="block font-mono text-[11px] uppercase tracking-[0.2em] text-terracotta-bright">
                    Bukti reservasi sah · OMAH GUYUB
                  </span>
                  <h3 id={ticketHeadingId} className="mt-0.5 font-display text-xl font-bold">
                    E-TIKET ARENA
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Tutup e-ticket"
                  className="flex h-11 w-11 items-center justify-center rounded-[2px] border border-paper/30 font-mono text-[11px] uppercase text-paper transition-colors hover:border-paper print:hidden"
                >
                  <X className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-navy bg-birch px-5 py-3">
                <div className="min-w-0">
                  <span className="block font-mono text-[11px] uppercase text-slate-muted">
                    Kode Booking
                  </span>
                  <span className="block break-all font-mono text-sm font-bold text-navy">
                    {ticket.code}
                  </span>
                </div>
                <StatusBadge status={ticket.status} />
              </div>

              <div className="flex items-center justify-between bg-cobalt px-5 py-2 font-mono text-[11px] uppercase tracking-wider text-paper">
                <span>Akses gerbang utama · hall A</span>
                <span>Check-in 15 mnt awal</span>
              </div>

              <div className="space-y-4 p-5">
                <div className="grid grid-cols-2 gap-3 border-b border-navy/15 pb-3 font-mono text-xs">
                  <div>
                    <span className="block text-[11px] uppercase text-slate-muted">Pemesan</span>
                    <span className="mt-0.5 block font-bold text-navy">{ticket.userName}</span>
                  </div>
                  <div>
                    <span className="block text-[11px] uppercase text-slate-muted">WhatsApp</span>
                    <span className="mt-0.5 block font-bold text-navy">{ticket.userPhone}</span>
                  </div>
                  <div>
                    <span className="block text-[11px] uppercase text-slate-muted">Lapangan</span>
                    <span className="mt-0.5 block font-semibold text-navy">{ticket.courtName}</span>
                  </div>
                  <div>
                    <span className="block text-[11px] uppercase text-slate-muted">Total</span>
                    <span className="mt-0.5 block font-bold text-terracotta">
                      {formatCurrency(ticket.totalPrice)}
                    </span>
                  </div>
                </div>

                <div className="rounded-[2px] border border-navy/20 bg-chalk p-2.5 font-mono text-xs">
                  <span className="block text-[11px] uppercase text-slate-muted">Jadwal main</span>
                  <span className="mt-0.5 block font-semibold text-navy">
                    {formatDateIndo(new Date(ticket.date))}
                  </span>
                  <span className="block font-semibold text-navy">
                    {formatTimeSlot({ startTime: ticket.startTime, endTime: ticket.endTime })} WIB
                  </span>
                </div>

                <div className="rounded-[2px] border border-navy/25 bg-chalk p-3">
                  <span className="block font-mono text-[11px] uppercase text-slate-muted">
                    Tunjukkan kode ini di meja resepsionis
                  </span>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <code className="min-w-0 flex-1 break-all rounded-[2px] border border-navy/25 bg-paper px-2 py-1.5 font-mono text-[12px] font-bold tracking-wide text-navy">
                      {ticket.code}
                    </code>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard
                          .writeText(ticket.code)
                          .then(() => toast.success("Kode booking disalin"))
                          .catch(() => toast.error("Gagal menyalin kode booking"));
                      }}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-[2px] border border-navy bg-paper px-2.5 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-navy transition-colors hover:bg-navy hover:text-paper print:hidden"
                    >
                      <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />
                      Salin
                    </button>
                  </div>
                  <p className="mt-2 font-mono text-[11px] uppercase leading-relaxed tracking-wide text-terracotta">
                    Jangan bagikan kode booking/e-tiket kepada orang yang tidak dipercaya.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 print:hidden">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="min-h-11 flex-1 rounded-[2px] border border-navy bg-birch px-3 py-2.5 font-mono text-[11px] font-bold uppercase tracking-wider text-navy transition-colors hover:bg-navy hover:text-paper"
                  >
                    Cetak / Simpan PDF
                  </button>
                  <a
                    href={`/bookings/${ticket.code}`}
                    className="flex min-h-11 flex-1 items-center justify-center rounded-[2px] border border-navy bg-terracotta px-3 py-2.5 font-mono text-[11px] font-bold uppercase tracking-wider text-paper transition-colors hover:bg-navy"
                  >
                    Bayar tiket ini
                  </a>
                  <button
                    type="button"
                    onClick={onClose}
                    className="min-h-11 flex-1 rounded-[2px] border border-navy/30 bg-paper px-3 py-2.5 font-mono text-[11px] font-bold uppercase tracking-wider text-navy transition-colors hover:bg-birch"
                  >
                    Selesai
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
