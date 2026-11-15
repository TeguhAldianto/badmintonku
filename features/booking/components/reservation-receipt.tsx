"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";

import { formatCurrency, formatTimeSlot } from "@/shared/lib/format";

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
      <span className="h-3 w-3 shrink-0 -translate-x-1.5 border border-[#141824] bg-[#F5F3EE]" />
      <span className="min-w-0 flex-1 border-t border-dashed border-[#141824]/40" />
      <span className="h-3 w-3 shrink-0 translate-x-1.5 border border-[#141824] bg-[#F5F3EE]" />
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

  return (
    <aside className="lg:sticky lg:top-20">
      <div className="overflow-hidden rounded-[2px] border border-[#141824] bg-[#FAF9F6]">
        <div className="flex items-center justify-between bg-[#141824] px-5 py-4 text-[#FAF9F6]">
          <div>
            <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-[#EAE6DD]/70">
              OMAH GUYUB · Dokumen #01
            </span>
            <h2 className="mt-0.5 font-display text-lg font-bold tracking-tight">STRUK RESERVASI</h2>
          </div>
          <span className="rounded-[2px] bg-[#C84B31] px-2.5 py-1 font-mono text-xs font-bold">
            {totalHours} JAM
          </span>
        </div>

        <div className="p-5">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#6E6A61]">
              Jadwal Dipilih
            </span>
            {groups.length > 0 ? (
              <button
                type="button"
                onClick={onClear}
                className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#C84B31] hover:underline"
              >
                [Hapus semua]
              </button>
            ) : null}
          </div>

          <div className="max-h-64 space-y-2 overflow-y-auto">
            {groups.length === 0 ? (
              <div className="rounded-[2px] border border-dashed border-[#141824]/30 bg-[#F5F3EE] p-4 text-center">
                <p className="font-mono text-xs font-bold uppercase tracking-wider text-[#6E6A61]">
                  Belum ada slot dipilih
                </p>
                <p className="mt-1 text-[11px] text-[#6E6A61]">
                  Klik blok jam tersedia pada matriks jadwal.
                </p>
              </div>
            ) : (
              groups.map((group) => (
                <div
                  key={`${group.courtId}-${group.startTime}`}
                  className="rounded-[2px] border border-[#141824]/25 bg-[#F5F3EE] p-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-bold text-[#141824]">{group.courtName}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-[#6E6A61]">{group.date}</p>
                      <p className="font-mono text-[11px] font-semibold text-[#141824]">
                        {formatTimeSlot({ startTime: group.startTime, endTime: group.endTime })} WIB
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-xs font-bold text-[#141824]">
                      {formatCurrency(group.subtotal)}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1">
                    {group.hours.map((hour) => (
                      <button
                        key={hour}
                        type="button"
                        onClick={() => onRemoveHour(group.courtId, hour)}
                        className="group inline-flex items-center gap-1 rounded-[2px] border border-[#141824]/30 bg-[#FAF9F6] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#141824] transition-colors hover:border-[#C84B31] hover:text-[#C84B31]"
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
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit({ userName: userName.trim(), userPhone: userPhone.trim() });
          }}
        >
          <div>
            <label
              htmlFor="booking-name"
              className="mb-1 block font-mono text-[11px] font-bold uppercase tracking-wider text-[#141824]"
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
              onChange={(event) => setUserName(event.target.value)}
              placeholder="Nama lengkap sesuai identitas"
              className="w-full rounded-[2px] border border-[#141824]/30 bg-[#F5F3EE] px-3 py-2.5 text-sm text-[#141824] outline-none transition-colors placeholder:text-[#6E6A61]/70 focus:border-[#141824]"
            />
          </div>

          <div>
            <label
              htmlFor="booking-phone"
              className="mb-1 block font-mono text-[11px] font-bold uppercase tracking-wider text-[#141824]"
            >
              Nomor WhatsApp *
            </label>
            <input
              id="booking-phone"
              type="tel"
              required
              minLength={8}
              value={userPhone}
              onChange={(event) => setUserPhone(event.target.value)}
              placeholder="0812xxxxxxxx"
              inputMode="tel"
              className="w-full rounded-[2px] border border-[#141824]/30 bg-[#F5F3EE] px-3 py-2.5 font-mono text-sm text-[#141824] outline-none transition-colors placeholder:text-[#6E6A61]/70 focus:border-[#141824]"
            />
            <p className="mt-1 font-mono text-[10px] uppercase tracking-wide text-[#6E6A61]">
              Nomor ini dipakai untuk membuka tiket & verifikasi pembayaran.
            </p>
          </div>

          {expiredNotice ? (
            <p className="rounded-[2px] border border-[#C84B31]/50 bg-[#C84B31]/10 px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-[#C84B31]">
              {expiredNotice}
            </p>
          ) : null}

          <div className="space-y-1.5 border-t border-[#141824]/20 pt-3 font-mono text-xs">
            <div className="flex justify-between text-[#6E6A61]">
              <span>SEWA LAPANGAN ({totalHours} JAM)</span>
              <span className="font-semibold text-[#141824]">{formatCurrency(totalPrice)}</span>
            </div>
            <div className="flex justify-between text-[#6E6A61]">
              <span>BIAYA LAYANAN</span>
              <span className="font-semibold text-[#141824]">Rp 0</span>
            </div>
            <div className="flex items-baseline justify-between border-t border-dashed border-[#141824]/40 pt-2.5">
              <span className="text-xs font-bold text-[#141824]">TOTAL TAGIHAN</span>
              <span className="font-mono text-lg font-bold text-[#C84B31]">
                {formatCurrency(totalPrice)}
              </span>
            </div>
            <p className="pt-1 text-[10px] uppercase leading-relaxed tracking-wide text-[#6E6A61]">
              Tagihan final dihitung ulang oleh server dari konfigurasi harga/jam. Kode promo belum
              aktif pada skema pembayaran saat ini.
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting || totalHours === 0}
            className="flex w-full items-center justify-center gap-2 rounded-[2px] border border-[#141824] bg-[#C84B31] px-4 py-3.5 font-mono text-xs font-bold uppercase tracking-wider text-[#FAF9F6] transition-colors hover:bg-[#141824] disabled:cursor-not-allowed disabled:opacity-45"
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
