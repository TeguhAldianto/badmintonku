"use client";

import { useState, useEffect } from "react";
import { SLOT_STATUS_CONFIG } from "@/features/booking/lib/slots";
import type { SlotStatus } from "@/features/booking/types";
import { toCalendarDateString } from "@/shared/lib/date";

interface Court {
  id: number;
  name: string;
}

interface Slot {
  startTime: number;
  endTime: number;
  status: SlotStatus;
}

export default function AdminCalendarPage() {
  const [date, setDate] = useState<string>(toCalendarDateString(new Date()));
  const [courts, setCourts] = useState<Court[]>([]);
  const [availability, setAvailability] = useState<Record<number, Slot[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchCourtsAndSlots() {
      setLoading(true);
      setError("");
      try {
        const courtsRes = await fetch("/api/courts", { cache: "no-store" });
        const courtsData = await courtsRes.json();
        if (!courtsRes.ok || !courtsData.success) {
          throw new Error(courtsData.message ?? "Gagal memuat daftar lapangan");
        }
        const courtsList = (courtsData.data ?? []) as Court[];
        if (cancelled) return;
        setCourts(courtsList);

        let failedCourts = 0;
        const entries = await Promise.all(
          courtsList.map(async (court) => {
            try {
              const res = await fetch(
                `/api/availability?courtId=${court.id}&date=${date}`,
                { cache: "no-store" }
              );
              const payload = await res.json();
              if (!res.ok || !payload?.success) throw new Error("bad response");
              return [court.id, (payload.data?.slots ?? []) as Slot[]] as const;
            } catch {
              failedCourts += 1;
              return [court.id, [] as Slot[]] as const;
            }
          })
        );

        if (cancelled) return;
        setAvailability(Object.fromEntries(entries));

        if (failedCourts > 0) {
          setError(
            `${failedCourts} dari ${courtsList.length} jadwal lapangan gagal dimuat. Kotak "Belum ada slot" di bawah bisa berarti data tidak terbaca, bukan jadwal kosong.`
          );
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : "Gagal memuat jadwal");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchCourtsAndSlots();
    return () => {
      cancelled = true;
    };
  }, [date, reloadKey]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-navy pb-3">
        <div>
          <span className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-terracotta">
            Modul 02
          </span>
          <h1 className="mt-1 font-display text-xl font-bold tracking-tight sm:text-2xl">
            Kalender &amp; Jadwal Lapangan
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <label
            htmlFor="calendar-date-input"
            className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-muted"
          >
            Tanggal
          </label>
          <input
            id="calendar-date-input"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="rounded-[2px] border border-navy/30 bg-paper px-2.5 py-1.5 font-mono text-xs text-navy outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt focus:border-navy"
          />
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-2 rounded-[2px] border border-terracotta bg-terracotta/10 px-3 py-2"
        >
          <p className="font-mono text-[11px] uppercase leading-relaxed tracking-wide text-terracotta">
            {error}
          </p>
          <button
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
            className="min-h-9 shrink-0 rounded-[2px] border border-terracotta bg-paper px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-terracotta transition-colors hover:bg-terracotta hover:text-paper"
          >
            Coba lagi
          </button>
        </div>
      ) : null}

      {loading ? (
        <p className="border border-navy/25 bg-paper px-4 py-16 text-center font-mono text-[11px] uppercase tracking-wider text-slate-muted">
          Memuat jadwal…
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {courts.map((court) => {
            const courtSlots = availability[court.id] ?? [];
            const availableCount = courtSlots.filter((slot) => slot.status === "AVAILABLE").length;

            return (
              <section key={court.id} className="border border-navy bg-paper">
                <header className="flex items-center justify-between border-b border-navy bg-birch px-3 py-2.5">
                  <h2 className="font-mono text-[11px] font-bold uppercase tracking-wider text-navy">
                    {court.name}
                  </h2>
                  <span className="font-mono text-[11px] font-bold tabular-nums text-cobalt">
                    {availableCount} tersedia
                  </span>
                </header>

                <div className="max-h-[560px] space-y-1 overflow-y-auto p-2.5">
                  {courtSlots.length === 0 ? (
                    <p className="py-6 text-center font-mono text-[11px] uppercase tracking-wider text-slate-muted">
                      Belum ada slot
                    </p>
                  ) : (
                    courtSlots.map((slot) => (
                      <div
                        key={slot.startTime}
                        className="flex items-center justify-between gap-2 border border-navy/15 bg-chalk px-2.5 py-1.5"
                      >
                        <span className="font-mono text-[11px] font-semibold tabular-nums text-navy">
                          {String(slot.startTime).padStart(2, "0")}:00 –{" "}
                          {String(slot.endTime).padStart(2, "0")}:00
                        </span>
                        <span
                          className={`rounded-[2px] border px-1.5 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider ${SLOT_STATUS_CONFIG[slot.status].className}`}
                        >
                          {SLOT_STATUS_CONFIG[slot.status].label}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-navy/20 pt-3">
        {(["AVAILABLE", "PENDING", "BOOKED", "BLOCKED"] as SlotStatus[]).map((status) => (
          <span key={status} className="flex items-center gap-1.5">
            <span
              className={`inline-block h-3 w-3 rounded-[1px] border ${SLOT_STATUS_CONFIG[status].className}`}
            />
            <span className="font-mono text-[11px] uppercase tracking-wider text-slate-muted">
              {SLOT_STATUS_CONFIG[status].label}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
