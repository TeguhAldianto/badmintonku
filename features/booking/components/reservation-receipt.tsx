"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";

import { formatCurrency, formatDateIndo, formatTimeSlot } from "@/shared/lib/format";

export interface ReservationGroup {
  courtId: number;
  courtName: string;
  date: string;
  startTime: number;
  endTime: number;
  hours: number[];
  subtotal: number;
}

interface ReservationReceiptProps {
  groups: ReservationGroup[];
  totalHours: number;
  totalPrice: number;
  onRemoveHour: (courtId: number, hour: number) => void;
  onClear: () => void;
  onSubmit: (values: { userName: string; userPhone: string }) => void;
  submitting: boolean;
  expiredNotice?: string | null;
}

function Perforation() {
  return (
    <div className="relative flex items-center py-1" aria-hidden="true">
      <span className="h-3 w-3 shrink-0 -translate-x-1.5 border border-navy bg-chalk" />
      <span className="min-w-0 flex-1 border-t border-dashed border-navy/40" />
      <span className="h-3 w-3 shrink-0 translate-x-1.5 border border-navy bg-chalk" />
    </div>
  );
}

export function ReservationReceipt({
  groups,
  totalHours,
  totalPrice,
  onRemoveHour,
  onClear,
  onSubmit,
  submitting,
  expiredNotice,
}: ReservationReceiptProps) {
  const [userName, setUserName] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [nameError, setNameError] = useState("");
  const [phoneError, setPhoneError] = useState("");

  /**
   * Client-side validation mirrors the Zod schema in features/booking/schemas.ts so the
   * guest sees the problem next to the field instead of only a toast.
   */
  const validate = () => {
    let valid = true;

    if (userName.trim().length < 3) {
      setNameError("Nama pemesan minimal 3 karakter.");
      valid = false;
    } else {
      setNameError("");
    }

    const digits = userPhone.replace(/[^0-9]/g, "");
    if (digits.length < 8 || digits.length > 15) {
      setPhoneError("Nomor WhatsApp harus 8–15 digit angka, mis. 08123456789.");
      valid = false;
    } else {
      setPhoneError("");
    }

    return valid;
  };

  return (
    <aside className="lg:sticky lg:top-20">
      <div className="overflow-hidden rounded-[2px] border border-navy bg-paper">
        <div className="flex items-center justify-between bg-navy px-5 py-4 text-paper">
          <div>
            <span className="block font-mono text-[11px] uppercase tracking-[0.2em] text-birch/70">
              OMAH GUYUB · Ringkasan
            </span>
            <h2 className="mt-0.5 font-display text-lg font-bold tracking-tight">STRUK RESERVASI</h2>
          </div>
          <span className="rounded-[2px] bg-terracotta px-2.5 py-1 font-mono text-xs font-bold">
            {totalHours} JAM
          </span>
        </div>

        <div className="p-5">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-muted">
              Jadwal Dipilih
            </span>
            {groups.length > 0 ? (
              <button
                type="button"
                onClick={onClear}
                className="font-mono text-[11px] font-bold uppercase tracking-wider text-terracotta hover:underline"
              >
                [Hapus semua]
              </button>
            ) : null}
          </div>

          <div className="max-h-64 space-y-2 overflow-y-auto">
            {groups.length === 0 ? (
              <div className="rounded-[2px] border border-dashed border-navy/30 bg-chalk p-4 text-center">
                <p className="font-mono text-xs font-bold uppercase tracking-wider text-slate-muted">
                  Belum ada slot dipilih
                </p>
                <p className="mt-1 text-[11px] text-slate-muted">
                  Klik blok jam tersedia pada matriks jadwal.
                </p>
              </div>
            ) : (
              groups.map((group) => (
                <div
                  key={`${group.courtId}-${group.startTime}`}
                  className="rounded-[2px] border border-navy/25 bg-chalk p-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-bold text-navy">{group.courtName}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-slate-muted">
                        {formatDateIndo(new Date(group.date))}
                      </p>
                      <p className="font-mono text-[11px] font-semibold text-navy">
                        {formatTimeSlot({ startTime: group.startTime, endTime: group.endTime })} WIB
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-xs font-bold text-navy">
                      {formatCurrency(group.subtotal)}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1">
                    {group.hours.map((hour) => (
                      <button
                        key={hour}
                        type="button"
                        onClick={() => onRemoveHour(group.courtId, hour)}
                        className="group inline-flex min-h-8 items-center gap-1 rounded-[2px] border border-navy/30 bg-paper px-2 py-1 font-mono text-[11px] font-semibold text-navy transition-colors hover:border-terracotta hover:text-terracotta"
                        aria-label={`Hapus jam ${hour}:00`}
                      >
                        {String(hour).padStart(2, "0")}:00
                        <Trash2 className="h-2.5 w-2.5" strokeWidth={1.5} />
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <Perforation />

        <form
          className="space-y-4 p-5"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (!validate()) return;
            onSubmit({ userName: userName.trim(), userPhone: userPhone.trim() });
          }}
        >
          <div>
            <label
              htmlFor="booking-name"
              className="mb-1 block font-mono text-[11px] font-bold uppercase tracking-wider text-navy"
            >
              Nama Pemesan *
            </label>
            <input
              id="booking-name"
              type="text"
              required
              minLength={3}
              maxLength={100}
              value={userName}
              onChange={(event) => {
                setUserName(event.target.value);
                if (nameError) setNameError("");
              }}
              placeholder="Nama lengkap sesuai identitas"
              aria-invalid={Boolean(nameError)}
              aria-describedby={nameError ? "booking-name-error" : undefined}
              className="w-full rounded-[2px] border border-navy/30 bg-chalk px-3 py-2.5 text-sm text-navy outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt transition-colors placeholder:text-slate-muted/70 focus:border-navy aria-[invalid=true]:border-terracotta"
            />
            {nameError ? (
              <p
                id="booking-name-error"
                role="alert"
                className="mt-1 font-mono text-[11px] uppercase tracking-wide text-terracotta"
              >
                {nameError}
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="booking-phone"
              className="mb-1 block font-mono text-[11px] font-bold uppercase tracking-wider text-navy"
            >
              Nomor WhatsApp *
            </label>
            <input
              id="booking-phone"
              type="tel"
              required
              minLength={8}
              value={userPhone}
              onChange={(event) => {
                setUserPhone(event.target.value);
                if (phoneError) setPhoneError("");
              }}
              placeholder="0812xxxxxxxx"
              inputMode="tel"
              autoComplete="tel"
              aria-invalid={Boolean(phoneError)}
              aria-describedby={phoneError ? "booking-phone-error" : "booking-phone-hint"}
              className="w-full rounded-[2px] border border-navy/30 bg-chalk px-3 py-2.5 font-mono text-sm text-navy outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt transition-colors placeholder:text-slate-muted/70 focus:border-navy aria-[invalid=true]:border-terracotta"
            />
            {phoneError ? (
              <p
                id="booking-phone-error"
                role="alert"
                className="mt-1 font-mono text-[11px] uppercase tracking-wide text-terracotta"
              >
                {phoneError}
              </p>
            ) : (
              <p
                id="booking-phone-hint"
                className="mt-1 font-mono text-[11px] uppercase tracking-wide text-slate-muted"
              >
                Nomor ini dipakai untuk membuka tiket &amp; verifikasi pembayaran.
              </p>
            )}
          </div>

          {expiredNotice ? (
            <p className="rounded-[2px] border border-terracotta/50 bg-terracotta/10 px-3 py-2 font-mono text-[11px] uppercase tracking-wide text-terracotta">
              {expiredNotice}
            </p>
          ) : null}

          <div className="space-y-1.5 border-t border-navy/20 pt-3 font-mono text-xs">
            <div className="flex justify-between text-slate-muted">
              <span>SEWA LAPANGAN ({totalHours} JAM)</span>
              <span className="font-semibold text-navy">{formatCurrency(totalPrice)}</span>
            </div>
            <div className="flex justify-between text-slate-muted">
              <span>BIAYA LAYANAN</span>
              <span className="font-semibold text-navy">Rp 0</span>
            </div>
            <div className="flex items-baseline justify-between border-t border-dashed border-navy/40 pt-2.5">
              <span className="text-xs font-bold text-navy">TOTAL TAGIHAN</span>
              <span className="font-mono text-lg font-bold text-terracotta">
                {formatCurrency(totalPrice)}
              </span>
            </div>
            <p className="pt-1 text-[11px] uppercase leading-relaxed tracking-wide text-slate-muted">
              Tagihan final dihitung ulang oleh server dari konfigurasi harga/jam. Kode promo belum
              aktif pada skema pembayaran saat ini.
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting || totalHours === 0}
            className="flex w-full items-center justify-center gap-2 rounded-[2px] border border-navy bg-terracotta px-4 py-3.5 font-mono text-xs font-bold uppercase tracking-wider text-paper transition-colors hover:bg-navy disabled:cursor-not-allowed disabled:opacity-45"
          >
            {submitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                Memproses reservasi…
              </>
            ) : (
              "Konfirmasi Reservasi →"
            )}
          </button>
        </form>
      </div>
    </aside>
  );
}
