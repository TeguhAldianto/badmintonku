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

  useEffect(() => {
    let cancelled = false;

    async function fetchCourtsAndSlots() {
      setLoading(true);
      try {
        const courtsRes = await fetch("/api/courts");
        const courtsData = await courtsRes.json();
        const courtsList = (courtsData.data ?? []) as Court[];
        if (cancelled) return;
        setCourts(courtsList);

        const entries = await Promise.all(
          courtsList.map(async (court) => {
            const res = await fetch(`/api/availability?courtId=${court.id}&date=${date}`);
            const payload = await res.json();
            return [court.id, (payload.data?.slots ?? []) as Slot[]] as const;
          })
        );

        if (!cancelled) {
          setAvailability(Object.fromEntries(entries));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchCourtsAndSlots();
    return () => {
      cancelled = true;
    };
  }, [date]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#141824] pb-3">
        <div>
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#C84B31]">
            Modul 02
          </span>
          <h1 className="mt-1 font-display text-xl font-bold tracking-tight sm:text-2xl">
            Kalender &amp; Jadwal Lapangan
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <label
            htmlFor="calendar-date-input"
            className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#6E6A61]"
          >
            Tanggal
          </label>
          <input
            id="calendar-date-input"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="rounded-[2px] border border-[#141824]/30 bg-[#FAF9F6] px-2.5 py-1.5 font-mono text-xs text-[#141824] outline-none focus:border-[#141824]"
          />
        </div>
      </div>

      {loading ? (
        <p className="border border-[#141824]/25 bg-[#FAF9F6] px-4 py-16 text-center font-mono text-[11px] uppercase tracking-wider text-[#6E6A61]">
          Memuat jadwal…
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {courts.map((court) => {
            const courtSlots = availability[court.id] ?? [];
            const availableCount = courtSlots.filter((slot) => slot.status === "AVAILABLE").length;

            return (
              <section key={court.id} className="border border-[#141824] bg-[#FAF9F6]">
                <header className="flex items-center justify-between border-b border-[#141824] bg-[#EAE6DD] px-3 py-2.5">
                  <h2 className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#141824]">
                    {court.name}
                  </h2>
                  <span className="font-mono text-[10px] font-bold tabular-nums text-[#1E3A8A]">
                    {availableCount} tersedia
                  </span>
                </header>

                <div className="max-h-[560px] space-y-1 overflow-y-auto p-2.5">
                  {courtSlots.length === 0 ? (
                    <p className="py-6 text-center font-mono text-[10px] uppercase tracking-wider text-[#6E6A61]">
                      Belum ada slot
                    </p>
                  ) : (
                    courtSlots.map((slot) => (
                      <div
                        key={slot.startTime}
                        className="flex items-center justify-between gap-2 border border-[#141824]/15 bg-[#F5F3EE] px-2.5 py-1.5"
                      >
                        <span className="font-mono text-[11px] font-semibold tabular-nums text-[#141824]">
                          {String(slot.startTime).padStart(2, "0")}:00 –{" "}
                          {String(slot.endTime).padStart(2, "0")}:00
                        </span>
                        <span
                          className={`rounded-[2px] border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${SLOT_STATUS_CONFIG[slot.status].className}`}
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

      <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-[#141824]/20 pt-3">
        {(["AVAILABLE", "PENDING", "BOOKED", "BLOCKED"] as SlotStatus[]).map((status) => (
          <span key={status} className="flex items-center gap-1.5">
            <span
              className={`inline-block h-3 w-3 rounded-[1px] border ${SLOT_STATUS_CONFIG[status].className}`}
            />
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#6E6A61]">
              {SLOT_STATUS_CONFIG[status].label}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
