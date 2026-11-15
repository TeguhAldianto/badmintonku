"use client";

import { X } from "lucide-react";

import { formatCurrency, formatDateIndo, formatTimeSlot } from "@/shared/lib/format";
import { StatusBadge } from "@/shared/components/status-badge";

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

function hashSeed(seed: string) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function QrPattern({ seed }: { seed: string }) {
  const grid = 11;
  const hash = hashSeed(seed);
  const isFinder = (row: number, col: number) =>
    (row < 3 && col < 3) || (row < 3 && col >= grid - 3) || (row >= grid - 3 && col < 3);

  const cells: React.ReactNode[] = [];
  for (let row = 0; row < grid; row += 1) {
    for (let col = 0; col < grid; col += 1) {
      if (isFinder(row, col)) continue;
      const value = (hash + row * 37 + col * 19 + row * col * 11) % 3;
      if (value === 0 || value === 1) {
        cells.push(
          <rect
            key={`${row}-${col}`}
            x={col * 8 + 6}
            y={row * 8 + 6}
            width={6.5}
            height={6.5}
            fill="#141824"
          />
        );
      }
    }
  }

  const finder = (x: number, y: number, accent: string) => (
    <g>
      <rect x={x} y={y} width={22} height={22} stroke="#141824" strokeWidth={3} fill="none" />
      <rect x={x + 6} y={y + 6} width={10} height={10} fill={accent} />
    </g>
  );

  return (
    <svg className="h-full w-full" viewBox="0 0 100 100" fill="none" aria-hidden="true">
      {finder(6, 6, "#C84B31")}
      {finder(72, 6, "#1E3A8A")}
      {finder(6, 72, "#141824")}
      {cells}
    </svg>
  );
}

function BarcodePattern({ seed }: { seed: string }) {
  const bars: React.ReactNode[] = [];
  let x = 2;
  for (let index = 0; index < 38; index += 1) {
    const charCode = seed.charCodeAt(index % Math.max(seed.length, 1));
    const width = ((charCode + index) % 3) + 1.5;
    const gap = ((charCode * (index + 1)) % 2) + 1.5;
    if (x + width > 218) break;
    bars.push(<rect key={index} x={x} y={2} width={width} height={40} fill="#141824" />);
    x += width + gap;
  }
  return (
    <svg
      className="h-full w-full"
      viewBox="0 0 220 44"
      preserveAspectRatio="none"
      fill="none"
      aria-hidden="true"
    >
      {bars}
    </svg>
  );
}

export function ETicketModal({
  tickets,
  onClose,
}: {
  tickets: ETicketData[];
  onClose: () => void;
}) {
  if (tickets.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#141824]/70 p-4 print:static print:block print:overflow-visible print:bg-white print:p-0"
      role="dialog"
      aria-modal="true"
      aria-labelledby="e-ticket-heading"
    >
      <div className="my-auto w-full max-w-md space-y-3 print:my-0 print:max-w-none print:space-y-0">
        {tickets.map((ticket) => (
          <div
            key={ticket.code}
            className="print-ticket overflow-hidden rounded-[2px] border-2 border-[#141824] bg-[#FAF9F6] print:mb-3 print:break-inside-avoid"
            id="printable-ticket"
          >
            <div className="flex items-start justify-between gap-3 bg-[#141824] px-5 py-4 text-[#FAF9F6]">
              <div>
                <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-[#C84B31]">
                  Bukti reservasi sah · BadmintonKu
                </span>
                <h3 id="e-ticket-heading" className="mt-0.5 font-display text-xl font-bold">
                  E-TICKET ARENA
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup e-ticket"
                className="rounded-[2px] border border-[#FAF9F6]/30 px-2 py-1 font-mono text-[10px] uppercase text-[#FAF9F6] transition-colors hover:border-[#FAF9F6] print:hidden"
              >
                <X className="h-3 w-3" strokeWidth={1.5} />
              </button>
            </div>

            <div className="flex items-center justify-between gap-2 border-b border-[#141824] bg-[#EAE6DD] px-5 py-3">
              <div>
                <span className="block font-mono text-[10px] uppercase text-[#6E6A61]">Kode Booking</span>
                <span className="font-mono text-sm font-bold text-[#141824]">{ticket.code}</span>
              </div>
              <StatusBadge status={ticket.status} />
            </div>

            <div className="flex items-center justify-between bg-[#1E3A8A] px-5 py-2 font-mono text-[10px] uppercase tracking-wider text-[#FAF9F6]">
              <span>Akses gerbang utama · hall A</span>
              <span>Check-in 15 mnt awal</span>
            </div>

            <div className="space-y-4 p-5">
              <div className="grid grid-cols-2 gap-3 border-b border-[#141824]/15 pb-3 font-mono text-xs">
                <div>
                  <span className="block text-[10px] uppercase text-[#6E6A61]">Pemesan</span>
                  <span className="mt-0.5 block font-bold text-[#141824]">{ticket.userName}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase text-[#6E6A61]">WhatsApp</span>
                  <span className="mt-0.5 block font-bold text-[#141824]">{ticket.userPhone}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase text-[#6E6A61]">Lapangan</span>
                  <span className="mt-0.5 block font-semibold text-[#141824]">{ticket.courtName}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase text-[#6E6A61]">Total</span>
                  <span className="mt-0.5 block font-bold text-[#C84B31]">
                    {formatCurrency(ticket.totalPrice)}
                  </span>
                </div>
              </div>

              <div className="rounded-[2px] border border-[#141824]/20 bg-[#F5F3EE] p-2.5 font-mono text-xs">
                <span className="block text-[10px] uppercase text-[#6E6A61]">Jadwal main</span>
                <span className="mt-0.5 block font-semibold text-[#141824]">
                  {formatDateIndo(new Date(ticket.date))}
                </span>
                <span className="block font-semibold text-[#141824]">
                  {formatTimeSlot({ startTime: ticket.startTime, endTime: ticket.endTime })} WIB
                </span>
              </div>

              <div className="flex items-center gap-4 rounded-[2px] border border-[#141824]/25 bg-[#F5F3EE] p-3">
                <div className="h-20 w-20 shrink-0 border border-[#141824]/20 bg-[#FAF9F6] p-1.5">
                  <QrPattern seed={ticket.code} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block font-mono text-[10px] uppercase text-[#6E6A61]">
                    Pindai di meja resepsionis
                  </span>
                  <div className="mt-1 h-11 w-full">
                    <BarcodePattern seed={ticket.code} />
                  </div>
                  <span className="mt-1 block font-mono text-[10px] tracking-widest text-[#141824]">
                    *{ticket.code}*
                  </span>
                </div>
              </div>

              <div className="flex gap-2 print:hidden">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 rounded-[2px] border border-[#141824] bg-[#EAE6DD] px-3 py-2.5 font-mono text-[11px] font-bold uppercase tracking-wider text-[#141824] transition-colors hover:bg-[#141824] hover:text-[#FAF9F6]"
                >
                  Cetak / Simpan PDF
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-[2px] border border-[#141824] bg-[#C84B31] px-3 py-2.5 font-mono text-[11px] font-bold uppercase tracking-wider text-[#FAF9F6] transition-colors hover:bg-[#141824]"
                >
                  Selesai
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
