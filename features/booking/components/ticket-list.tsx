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
  addLocalTickets,
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
  const [phoneLookup, setPhoneLookup] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [otpError, setOtpError] = useState("");
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

  const handleSendOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    const phone = phoneLookup.trim();
    const digits = phone.replace(/[^0-9]/g, "");

    if (digits.length < 8 || digits.length > 15) {
      setPhoneError("Masukkan nomor WhatsApp 8–15 digit, mis. 08123456789.");
      return;
    }

    setPhoneError("");
    setOtpError("");
    setSendingOtp(true);
    try {
      const response = await fetch("/api/bookings/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        toast.error(payload.message ?? "Gagal mengirim kode verifikasi");
        return;
      }

      setOtpSent(true);
      toast.success("Jika nomor terdaftar, kode verifikasi telah dikirim ke WhatsApp.");
    } catch {
      toast.error("Gagal mengirim kode verifikasi");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    const phone = phoneLookup.trim();
    const code = otpCode.trim();

    if (!/^\d{6}$/.test(code)) {
      setOtpError("Masukkan kode verifikasi 6 digit.");
      return;
    }

    setOtpError("");
    setRecovering(true);
    try {
      const response = await fetch("/api/bookings/lookup/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        setOtpError(payload.message ?? "Kode verifikasi salah atau kedaluwarsa");
        return;
      }

      const found = (payload.data ?? []) as GuestBooking[];
      if (found.length === 0) {
        toast.error("Tidak ada tiket aktif pada nomor ini");
        return;
      }

      addLocalTickets(found.map((booking) => booking.id));
      setPhoneLookup("");
      setOtpCode("");
      setOtpSent(false);
      await load();
      toast.success(`${found.length} tiket dipulihkan ke perangkat ini`);
    } catch {
      toast.error("Gagal memverifikasi kode");
    } finally {
      setRecovering(false);
    }
  };

  const handleRemove = (code: string) => {
    removeLocalTicket(code);
    setBookings((previous) => previous.filter((booking) => booking.id !== code));
    toast.success("Tiket dihapus dari perangkat ini");
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 border border-navy/25 bg-paper px-4 py-6 font-mono text-[11px] uppercase tracking-wider text-slate-muted">
        <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
        Memuat tiket tersimpan…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleLookup}
        className="flex flex-col gap-2 border border-navy bg-birch p-3 sm:flex-row sm:items-center"
      >
        <label
          htmlFor="lookup-code"
          className="shrink-0 font-mono text-[11px] font-bold uppercase tracking-wider text-navy"
        >
          Cari kode booking
        </label>
        <input
          id="lookup-code"
          value={lookup}
          onChange={(event) => setLookup(event.target.value)}
          placeholder="Tempel kode tiket, mis. cm9x…"
          className="w-full rounded-[2px] border border-navy/30 bg-paper px-3 py-2 font-mono text-xs text-navy outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt transition-colors placeholder:text-slate-muted/60 focus:border-navy"
        />
        <button
          type="submit"
          disabled={looking}
          className="min-h-11 shrink-0 rounded-[2px] border border-navy bg-navy px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-wider text-paper transition-colors hover:bg-terracotta hover:border-terracotta disabled:opacity-50"
        >
          {looking ? "Mencari…" : "Tambahkan"}
        </button>
      </form>

      <section className="border border-navy/25 bg-paper p-3">
        <h2 className="font-mono text-[11px] font-bold uppercase tracking-wider text-navy">
          Pulihkan tiket dengan nomor WhatsApp
        </h2>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-muted">
          Kehilangan daftar tiket karena berganti perangkat atau menghapus data peramban? Kami
          kirim kode 6 digit ke WhatsApp nomor Anda untuk memverifikasi kepemilikan, lalu tiket
          pada nomor tersebut ditambahkan ke perangkat ini.
        </p>

        <form onSubmit={handleSendOtp} className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="w-full sm:max-w-xs">
            <label
              htmlFor="lookup-phone"
              className="block font-mono text-[11px] uppercase tracking-wider text-slate-muted"
            >
              Nomor WhatsApp
            </label>
            <input
              id="lookup-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phoneLookup}
              onChange={(event) => {
                setPhoneLookup(event.target.value);
                setOtpSent(false);
                setOtpCode("");
                if (phoneError) setPhoneError("");
              }}
              placeholder="0812xxxxxxxx"
              aria-invalid={Boolean(phoneError)}
              aria-describedby={phoneError ? "lookup-phone-error" : undefined}
              className="mt-1 w-full rounded-[2px] border border-navy/30 bg-chalk px-3 py-2 font-mono text-xs text-navy outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt transition-colors placeholder:text-slate-muted/60 focus:border-navy aria-[invalid=true]:border-terracotta"
            />
          </div>
          <button
            type="submit"
            disabled={sendingOtp}
            className="min-h-11 shrink-0 rounded-[2px] border border-navy bg-paper px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-wider text-navy transition-colors hover:bg-navy hover:text-paper disabled:opacity-50"
          >
            {sendingOtp ? "Mengirim…" : otpSent ? "Kirim ulang kode" : "Kirim kode"}
          </button>
        </form>

        {phoneError ? (
          <p
            id="lookup-phone-error"
            role="alert"
            className="mt-1.5 font-mono text-[11px] uppercase tracking-wide text-terracotta"
          >
            {phoneError}
          </p>
        ) : null}

        {otpSent ? (
          <form onSubmit={handleVerifyOtp} className="mt-3 flex flex-col gap-2 border-t border-navy/15 pt-3 sm:flex-row sm:items-end">
            <div className="w-full sm:max-w-xs">
              <label
                htmlFor="lookup-otp"
                className="block font-mono text-[11px] uppercase tracking-wider text-slate-muted"
              >
                Kode verifikasi 6 digit
              </label>
              <input
                id="lookup-otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={otpCode}
                onChange={(event) => {
                  setOtpCode(event.target.value.replace(/[^0-9]/g, "").slice(0, 6));
                  if (otpError) setOtpError("");
                }}
                placeholder="123456"
                aria-invalid={Boolean(otpError)}
                aria-describedby={otpError ? "lookup-otp-error" : undefined}
                className="mt-1 w-full rounded-[2px] border border-navy/30 bg-chalk px-3 py-2 font-mono text-xs text-navy outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt transition-colors placeholder:text-slate-muted/60 focus:border-navy aria-[invalid=true]:border-terracotta"
              />
            </div>
            <button
              type="submit"
              disabled={recovering}
              className="min-h-11 shrink-0 rounded-[2px] border border-navy bg-navy px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-wider text-paper transition-colors hover:bg-terracotta hover:border-terracotta disabled:opacity-50"
            >
              {recovering ? "Memverifikasi…" : "Verifikasi & pulihkan"}
            </button>
          </form>
        ) : null}

        {otpError ? (
          <p
            id="lookup-otp-error"
            role="alert"
            className="mt-1.5 font-mono text-[11px] uppercase tracking-wide text-terracotta"
          >
            {otpError}
          </p>
        ) : null}
      </section>

      {bookings.length === 0 ? (
        <div className="border border-dashed border-navy/35 bg-paper p-10 text-center">
          <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-[2px] border border-navy/30 bg-birch text-navy">
            <TicketIcon className="h-4 w-4" strokeWidth={1.5} />
          </span>
          <h2 className="mt-3 font-display text-base font-bold text-navy">
            Belum ada tiket di perangkat ini
          </h2>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-muted">
            Tiket yang Anda buat otomatis tersimpan di peramban ini. Anda juga dapat menambahkan
            tiket lama dengan menempel kode booking di atas.
          </p>
          <Link
            href="/booking"
            className="mt-4 inline-flex items-center gap-2 rounded-[2px] border border-navy bg-terracotta px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-wider text-paper transition-colors hover:bg-navy"
          >
            Buat reservasi baru
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {bookings.map((booking) => (
            <article
              key={booking.id}
              className="flex flex-col justify-between rounded-[2px] border border-navy bg-paper"
            >
              <header className="flex items-start justify-between gap-3 border-b border-navy bg-birch px-4 py-2.5">
                <div className="min-w-0">
                  <span className="block font-mono text-[11px] uppercase tracking-[0.2em] text-slate-muted">
                    Kode booking
                  </span>
                  <span className="mt-0.5 block truncate font-mono text-[11px] font-bold text-navy">
                    {booking.id}
                  </span>
                </div>
                <StatusBadge status={booking.status} />
              </header>

              <div className="flex-1 space-y-2 p-4">
                <p className="font-display text-sm font-bold text-navy">{booking.court.name}</p>
                <p className="font-mono text-[11px] text-slate-muted">
                  {formatDateIndo(new Date(booking.date))}
                </p>
                <p className="font-mono text-xs font-semibold text-navy">
                  {formatTimeSlot({ startTime: booking.startTime, endTime: booking.endTime })} WIB
                </p>
                <div className="flex items-baseline justify-between border-t border-navy/15 pt-2">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-slate-muted">
                    Total
                  </span>
                  <span className="font-mono text-sm font-bold text-terracotta">
                    {formatCurrency(booking.totalPrice)}
                  </span>
                </div>
              </div>

              <footer className="flex gap-px border-t border-navy/20 bg-navy/20">
                <button
                  type="button"
                  onClick={() => setActiveTickets([toTicketData(booking)])}
                  className="flex-1 bg-paper px-3 py-2.5 font-mono text-[11px] font-bold uppercase tracking-wider text-navy transition-colors hover:bg-birch"
                >
                  Lihat e-tiket
                </button>
                <Link
                  href={`/bookings/${booking.id}`}
                  className="flex-1 bg-navy px-3 py-2.5 text-center font-mono text-[11px] font-bold uppercase tracking-wider text-paper transition-colors hover:bg-cobalt"
                >
                  Status &amp; bayar
                </Link>
                <button
                  type="button"
                  onClick={() => handleRemove(booking.id)}
                  aria-label={`Hapus tiket ${booking.id}`}
                  className="flex w-10 items-center justify-center bg-paper text-slate-muted transition-colors hover:bg-terracotta hover:text-paper"
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                </button>
              </footer>
            </article>
          ))}
        </div>
      )}

      <p className="font-mono text-[11px] uppercase leading-relaxed tracking-wider text-slate-muted">
        Daftar tiket disimpan pada peramban ini. Menghapus data peramban akan menghapus daftar,
        namun tiket tetap dapat dibuka melalui kode booking.
      </p>

      <ETicketModal tickets={activeTickets} onClose={() => setActiveTickets([])} />
    </div>
  );
}
