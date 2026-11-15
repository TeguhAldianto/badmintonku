"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Ticket as TicketIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ETicketModal, type ETicketData } from "@/features/booking/components/e-ticket-modal";
import { StatusBadge } from "@/shared/components/status-badge";
import { formatCurrency, formatDateIndo, formatTimeSlot } from "@/shared/lib/format";
import {
  addLocalTicket,
  readLocalTickets,
  removeLocalTicket,
  TICKETS_CHANGED_EVENT,
} from "@/features/booking/lib/ticket-store";

interface GuestBooking {
  id: string;
  status: string;
  date: string;
  startTime: number;
  endTime: number;
  userName: string;
  userPhoneMasked: string;
  userPhone?: string;
  totalPrice: number;
  expiresAt: string;
  court: { id: number; name: string };
  payment: { status: string; method: string | null } | null;
}

async function fetchBooking(code: string): Promise<GuestBooking | null> {
  try {
    const response = await fetch(`/api/bookings/${code}`, { cache: "no-store" });
    const payload = await response.json();
    if (!payload.success) return null;
    return payload.data as GuestBooking;
  } catch {
    return null;
  }
}

function toTicketData(booking: GuestBooking): ETicketData {
  return {
    code: booking.id,
    courtName: booking.court.name,
    date: booking.date,
    startTime: booking.startTime,
    endTime: booking.endTime,
    totalPrice: Number(booking.totalPrice),
    userName: booking.userName,
    userPhone: booking.userPhoneMasked || booking.userPhone || "—",
    status: booking.status,
  };
}

export function TicketList() {
  const [bookings, setBookings] = useState<GuestBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [lookup, setLookup] = useState("");
  const [looking, setLooking] = useState(false);
  const [activeTickets, setActiveTickets] = useState<ETicketData[]>([]);

  const load = useCallback(async () => {
    const local = readLocalTickets();
    try {
      const results = await Promise.all(local.map((ticket) => fetchBooking(ticket.code)));
      setBookings(results.filter((item): item is GuestBooking => item !== null));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();

    const handler = () => {
      void load();
    };
    window.addEventListener(TICKETS_CHANGED_EVENT, handler);
    return () => window.removeEventListener(TICKETS_CHANGED_EVENT, handler);
  }, [load]);

  const handleLookup = async (event: React.FormEvent) => {
    event.preventDefault();
    const code = lookup.trim();
    if (!code) {
      toast.error("Masukkan kode booking terlebih dahulu");
      return;
    }

    setLooking(true);
    try {
      const booking = await fetchBooking(code);
      if (!booking) {
        toast.error("Kode booking tidak ditemukan");
        return;
      }
      addLocalTicket(booking.id);
      setLookup("");
      toast.success("Tiket ditambahkan ke perangkat ini");
      await load();
    } finally {
      setLooking(false);
    }
  };

  const handleRemove = (code: string) => {
    removeLocalTicket(code);
    setBookings((previous) => previous.filter((booking) => booking.id !== code));
    toast.success("Tiket dihapus dari perangkat ini");
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 border border-[#141824]/25 bg-[#FAF9F6] px-4 py-6 font-mono text-[11px] uppercase tracking-wider text-[#6E6A61]">
        <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
        Memuat tiket tersimpan…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Lookup */}
      <form
        onSubmit={handleLookup}
        className="flex flex-col gap-2 border border-[#141824] bg-[#EAE6DD] p-3 sm:flex-row sm:items-center"
      >
        <label
          htmlFor="lookup-code"
          className="shrink-0 font-mono text-[10px] font-bold uppercase tracking-wider text-[#141824]"
        >
          Cari kode booking
        </label>
        <input
          id="lookup-code"
          value={lookup}
          onChange={(event) => setLookup(event.target.value)}
          placeholder="Tempel kode tiket, mis. cm9x…"
          className="w-full rounded-[2px] border border-[#141824]/30 bg-[#FAF9F6] px-3 py-2 font-mono text-xs text-[#141824] outline-none transition-colors placeholder:text-[#6E6A61]/60 focus:border-[#141824]"
        />
        <button
          type="submit"
          disabled={looking}
          className="shrink-0 rounded-[2px] border border-[#141824] bg-[#141824] px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-[#FAF9F6] transition-colors hover:bg-[#C84B31] hover:border-[#C84B31] disabled:opacity-50"
        >
          {looking ? "Mencari…" : "Tambahkan"}
        </button>
      </form>

      {bookings.length === 0 ? (
        <div className="border border-dashed border-[#141824]/35 bg-[#FAF9F6] p-10 text-center">
          <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-[2px] border border-[#141824]/30 bg-[#EAE6DD] text-[#141824]">
            <TicketIcon className="h-4 w-4" strokeWidth={1.5} />
          </span>
          <h2 className="mt-3 font-display text-base font-bold text-[#141824]">
            Belum ada tiket di perangkat ini
          </h2>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-[#6E6A61]">
            Tiket yang Anda buat otomatis tersimpan di peramban ini. Anda juga dapat menambahkan
            tiket lama dengan menempel kode booking di atas.
          </p>
          <Link
            href="/booking"
            className="mt-4 inline-flex items-center gap-2 rounded-[2px] border border-[#141824] bg-[#C84B31] px-4 py-2.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[#FAF9F6] transition-colors hover:bg-[#141824]"
          >
            Buat reservasi baru
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {bookings.map((booking) => (
            <article
              key={booking.id}
              className="flex flex-col justify-between rounded-[2px] border border-[#141824] bg-[#FAF9F6]"
            >
              <header className="flex items-start justify-between gap-3 border-b border-[#141824] bg-[#EAE6DD] px-4 py-2.5">
                <div className="min-w-0">
                  <span className="block font-mono text-[9px] uppercase tracking-[0.2em] text-[#6E6A61]">
                    Kode booking
                  </span>
                  <span className="mt-0.5 block truncate font-mono text-[11px] font-bold text-[#141824]">
                    {booking.id}
                  </span>
                </div>
                <StatusBadge status={booking.status} />
              </header>

              <div className="flex-1 space-y-2 p-4">
                <p className="font-display text-sm font-bold text-[#141824]">{booking.court.name}</p>
                <p className="font-mono text-[11px] text-[#6E6A61]">
                  {formatDateIndo(new Date(booking.date))}
                </p>
                <p className="font-mono text-xs font-semibold text-[#141824]">
                  {formatTimeSlot({ startTime: booking.startTime, endTime: booking.endTime })} WIB
                </p>
                <div className="flex items-baseline justify-between border-t border-[#141824]/15 pt-2">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#6E6A61]">
                    Total
                  </span>
                  <span className="font-mono text-sm font-bold text-[#C84B31]">
                    {formatCurrency(booking.totalPrice)}
                  </span>
                </div>
              </div>

              <footer className="flex gap-px border-t border-[#141824]/20 bg-[#141824]/20">
                <button
                  type="button"
                  onClick={() => setActiveTickets([toTicketData(booking)])}
                  className="flex-1 bg-[#FAF9F6] px-3 py-2.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[#141824] transition-colors hover:bg-[#EAE6DD]"
                >
                  Lihat e-tiket
                </button>
                <Link
                  href={`/bookings/${booking.id}`}
                  className="flex-1 bg-[#141824] px-3 py-2.5 text-center font-mono text-[10px] font-bold uppercase tracking-wider text-[#FAF9F6] transition-colors hover:bg-[#1E3A8A]"
                >
                  Status &amp; bayar
                </Link>
                <button
                  type="button"
                  onClick={() => handleRemove(booking.id)}
                  aria-label={`Hapus tiket ${booking.id}`}
                  className="flex w-10 items-center justify-center bg-[#FAF9F6] text-[#6E6A61] transition-colors hover:bg-[#C84B31] hover:text-[#FAF9F6]"
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                </button>
              </footer>
            </article>
          ))}
        </div>
      )}

      <p className="font-mono text-[10px] uppercase leading-relaxed tracking-wider text-[#6E6A61]">
        Daftar tiket disimpan pada peramban ini. Menghapus data peramban akan menghapus daftar,
        namun tiket tetap dapat dibuka melalui kode booking.
      </p>

      <ETicketModal tickets={activeTickets} onClose={() => setActiveTickets([])} />
    </div>
  );
}
