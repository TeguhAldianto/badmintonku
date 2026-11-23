"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  addDaysDateOnly,
  parseDateOnly,
  toDateOnlyString,
  todayDateOnly,
} from "@/shared/lib/date";
import { formatDateIndo } from "@/shared/lib/format";

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const WEEKDAYS = ["SEN", "SEL", "RAB", "KAM", "JUM", "SAB", "MIN"];

interface DayCell {
  key: string;
  value: string | null;
  day: number | null;
  disabled: boolean;
}

export function CourtDatePicker() {
  const [todayValue, setTodayValue] = useState("");
  const [selected, setSelected] = useState("");
  const [viewYear, setViewYear] = useState<number | null>(null);
  const [viewMonth, setViewMonth] = useState<number | null>(null);

  useEffect(() => {
    async function init() {
      const today = todayDateOnly();
      const value = toDateOnlyString(today);
      setTodayValue(value);
      setSelected(value);
      setViewYear(today.getUTCFullYear());
      setViewMonth(today.getUTCMonth());
    }

    void init();
  }, []);

  const cells = useMemo<DayCell[]>(() => {
    if (viewYear === null || viewMonth === null) return [];

    const firstDay = new Date(Date.UTC(viewYear, viewMonth, 1)).getUTCDay();
    const leading = (firstDay + 6) % 7;
    const daysInMonth = new Date(Date.UTC(viewYear, viewMonth + 1, 0)).getUTCDate();
    const result: DayCell[] = [];

    for (let index = 0; index < leading; index += 1) {
      result.push({ key: `lead-${index}`, value: null, day: null, disabled: true });
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const value = `${viewYear.toString().padStart(4, "0")}-${(viewMonth + 1)
        .toString()
        .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
      result.push({
        key: value,
        value,
        day,
        disabled: value < todayValue,
      });
    }

    return result;
  }, [viewYear, viewMonth, todayValue]);

  const selectedDate = parseDateOnly(selected);
  const monthLabel =
    viewYear !== null && viewMonth !== null ? `${MONTH_NAMES[viewMonth]} ${viewYear}` : "Memuat…";

  const shiftMonth = (delta: number) => {
    if (viewYear === null || viewMonth === null) return;
    const next = new Date(Date.UTC(viewYear, viewMonth + delta, 1));
    setViewYear(next.getUTCFullYear());
    setViewMonth(next.getUTCMonth());
  };

  const quickPicks = [0, 1, 2, 3].map((offset) => {
    const base = parseDateOnly(selected) ?? parseDateOnly(todayValue) ?? todayDateOnly();
    const date = addDaysDateOnly(base, offset);
    const value = toDateOnlyString(date);
    return {
      value,
      label: new Intl.DateTimeFormat("id-ID", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        timeZone: "UTC",
      })
        .format(date)
        .replace(/\./g, "")
        .toUpperCase(),
    };
  });

  return (
    <div className="rounded-[2px] border border-navy bg-paper">
      <div className="flex items-center justify-between border-b border-navy bg-birch px-3 py-2">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          aria-label="Bulan sebelumnya"
          className="flex h-7 w-7 items-center justify-center rounded-[2px] border border-navy/30 bg-paper text-navy transition-colors hover:border-navy hover:bg-navy hover:text-paper"
        >
          <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
        <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-navy">
          {monthLabel}
        </span>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          aria-label="Bulan berikutnya"
          className="flex h-7 w-7 items-center justify-center rounded-[2px] border border-navy/30 bg-paper text-navy transition-colors hover:border-navy hover:bg-navy hover:text-paper"
        >
          <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>

      <div className="grid grid-cols-7 border-b border-navy/20 bg-chalk">
        {WEEKDAYS.map((day) => (
          <span
            key={day}
            className="py-1.5 text-center font-mono text-[11px] font-bold uppercase tracking-wider text-slate-muted"
          >
            {day}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px bg-navy/15 p-px">
        {cells.length === 0
          ? Array.from({ length: 35 }, (_, index) => (
              <span key={`skeleton-${index}`} className="block h-9 animate-pulse bg-birch" />
            ))
          : cells.map((cell) => {
              if (!cell.value) {
                return <span key={cell.key} className="block h-9 bg-paper" />;
              }
              const isSelected = cell.value === selected;
              const isToday = cell.value === todayValue;

              return (
                <button
                  key={cell.key}
                  type="button"
                  disabled={cell.disabled}
                  aria-pressed={isSelected}
                  onClick={() => setSelected(cell.value as string)}
                  className={cn(
                    "relative flex h-9 flex-col items-center justify-center font-mono text-[11px] font-semibold transition-colors",
                    isSelected
                      ? "bg-navy text-paper"
                      : cell.disabled
                        ? "cursor-not-allowed bg-chalk text-slate-muted/40 line-through"
                        : "bg-paper text-navy hover:bg-birch"
                  )}
                >
                  {cell.day}
                  {isToday && !isSelected ? (
                    <span className="absolute bottom-1 h-0.5 w-3 bg-terracotta" />
                  ) : null}
                </button>
              );
            })}
      </div>

      <div className="space-y-3 p-3">
        <div className="grid grid-cols-4 gap-px border border-navy/25 bg-navy/25">
          {quickPicks.map((pick) => (
            <button
              key={pick.value}
              type="button"
              onClick={() => setSelected(pick.value)}
              className={cn(
                "py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider transition-colors",
                pick.value === selected
                  ? "bg-terracotta text-paper"
                  : "bg-paper text-navy hover:bg-birch"
              )}
            >
              {pick.label}
            </button>
          ))}
        </div>

        <div className="border border-navy/25 bg-chalk px-3 py-2.5">
          <span className="block font-mono text-[11px] uppercase tracking-[0.2em] text-slate-muted">
            Tanggal terpilih
          </span>
          <span className="mt-0.5 block font-display text-sm font-bold text-navy">
            {selectedDate ? formatDateIndo(selectedDate) : "—"}
          </span>
        </div>

        <Link
          href={selected ? `/booking?date=${selected}` : "/booking"}
          aria-disabled={!selected}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-[2px] border border-navy px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-wider transition-colors",
            selected
              ? "bg-terracotta text-paper hover:bg-navy"
              : "pointer-events-none bg-birch text-slate-muted"
          )}
        >
          Lihat ketersediaan →
        </Link>
      </div>
    </div>
  );
}
