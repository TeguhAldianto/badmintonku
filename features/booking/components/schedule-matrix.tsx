"use client";

import { cn } from "@/lib/utils";
import type { TimeSlot } from "@/features/booking/types";
import type { FloorplanCourt } from "@/features/booking/components/interactive-floorplan";
import { formatCurrency, formatTimeSlot } from "@/shared/lib/format";

const PRIME_START_HOUR = 17;

export type CourtFilter = "all" | number;

interface ScheduleMatrixProps {
  courts: FloorplanCourt[];
  filter: CourtFilter;
  onChangeFilter: (filter: CourtFilter) => void;
  availability: Record<number, TimeSlot[]>;
  selectedHours: Record<number, number[]>;
  onToggleSlot: (courtId: number, startTime: number) => void;
  loading: boolean;
}

export function ScheduleMatrix({
  courts,
  filter,
  onChangeFilter,
  availability,
  selectedHours,
  onToggleSlot,
  loading,
}: ScheduleMatrixProps) {
  const visibleCourts = filter === "all" ? courts : courts.filter((court) => court.id === filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="group"
          aria-label="Filter lapangan"
          className="flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <button
            type="button"
            aria-pressed={filter === "all"}
            onClick={() => onChangeFilter("all")}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-[2px] border px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-wider transition-colors",
              filter === "all"
                ? "border-navy bg-navy text-paper"
                : "border-navy/30 bg-paper text-navy hover:border-navy"
            )}
          >
            Semua Lapangan
          </button>
          {courts.map((court) => (
            <button
              key={court.id}
              type="button"
              aria-pressed={filter === court.id}
              onClick={() => onChangeFilter(court.id)}
              className={cn(
                "shrink-0 whitespace-nowrap rounded-[2px] border px-3 py-2 font-mono text-[11px] font-semibold uppercase tracking-wider transition-colors",
                filter === court.id
                  ? "border-navy bg-navy text-paper"
                  : "border-navy/30 bg-paper text-navy hover:border-navy"
              )}
            >
              {court.name}
            </button>
          ))}
        </div>
        <span className="font-mono text-[11px] uppercase tracking-wider text-slate-muted">
          Durasi per blok: 60 menit
        </span>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((row) => (
            <div key={row} className="h-24 animate-pulse rounded-[2px] border border-navy/20 bg-birch" />
          ))}
        </div>
      ) : visibleCourts.length === 0 ? (
        <div className="rounded-[2px] border border-dashed border-navy/30 bg-paper p-8 text-center">
          <p className="font-mono text-xs font-bold uppercase tracking-wider text-navy">
            Tidak ada lapangan aktif
          </p>
          <p className="mt-1 text-xs text-slate-muted">Hubungi pengelola arena untuk mengaktifkan unit.</p>
        </div>
      ) : (
        visibleCourts.map((court) => {
          const slots = availability[court.id] ?? [];
          const picks = selectedHours[court.id] ?? [];

          return (
            <section key={court.id} className="rounded-[2px] border border-navy bg-paper">
              <header className="flex flex-wrap items-center justify-between gap-2 border-b border-navy bg-birch px-4 py-2.5">
                <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-navy sm:text-sm">
                  {court.name}
                </h3>
                <span className="font-mono text-[11px] font-bold text-navy">
                  {formatCurrency(court.pricePerHour)} / jam
                </span>
              </header>

              <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4 sm:p-4">
                {slots.map((slot) => {
                  const isSelected = picks.includes(slot.startTime);
                  const isPrime = slot.startTime >= PRIME_START_HOUR;
                  const isAvailable = slot.status === "AVAILABLE";

                  if (!isAvailable) {
                    return (
                      <div
                        key={slot.startTime}
                        aria-disabled="true"
                        className="slot-occupied flex min-h-[68px] cursor-not-allowed select-none flex-col justify-between rounded-[2px] border border-navy/25 p-2.5 text-left"
                      >
                        <span className="sr-only">
                          {slot.status === "BLOCKED" ? "Diblokir" : "Terisi"}, tidak dapat dipilih.
                        </span>
                        <span className="font-mono text-[11px] font-semibold text-slate-muted line-through">
                          {formatTimeSlot(slot)}
                        </span>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-muted">
                            {slot.status === "BLOCKED" ? "Diblokir" : "Terisi"}
                          </span>
                          {isPrime ? (
                            <span className="border border-navy/20 px-1 font-mono text-[11px] text-slate-muted">
                              PRIME
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <button
                      key={slot.startTime}
                      type="button"
                      onClick={() => onToggleSlot(court.id, slot.startTime)}
                      aria-pressed={isSelected}
                      className={cn(
                        "flex min-h-[68px] flex-col justify-between rounded-[2px] border p-2.5 text-left transition-colors",
                        isSelected
                          ? "border-navy bg-terracotta text-paper"
                          : "border-navy/25 bg-paper text-navy hover:border-cobalt hover:bg-cobalt/[0.04]"
                      )}
                    >
                      <span
                        className={cn(
                          "font-mono text-[11px] font-bold",
                          isSelected ? "text-paper" : "text-navy"
                        )}
                      >
                        {formatTimeSlot(slot)}
                      </span>
                      <span className="mt-2 flex items-center justify-between">
                        <span
                          className={cn(
                            "font-mono text-[11px] font-semibold",
                            isSelected ? "text-paper" : "text-navy"
                          )}
                        >
                          {formatCurrency(court.pricePerHour)}
                        </span>
                        {isPrime ? (
                          <span
                            className={cn(
                              "rounded-[2px] px-1.5 py-0.5 font-mono text-[11px] font-bold uppercase",
                              isSelected ? "bg-navy text-paper" : "bg-terracotta text-paper"
                            )}
                          >
                            Prime
                          </span>
                        ) : (
                          <span
                            className={cn(
                              "font-mono text-[11px] font-bold uppercase tracking-wider",
                              isSelected ? "text-paper" : "text-slate-muted"
                            )}
                          >
                            Reguler
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}

                {slots.length === 0 ? (
                  <p className="col-span-full py-6 text-center font-mono text-[11px] uppercase tracking-wider text-slate-muted">
                    Jadwal belum tersedia untuk tanggal ini
                  </p>
                ) : null}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
