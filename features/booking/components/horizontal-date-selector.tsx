"use client";

import { format, addDays, isBefore, startOfDay, isSameDay } from "date-fns";
import { id } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { memo, useCallback } from "react";

interface HorizontalDateSelectorProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
}

export const HorizontalDateSelector = memo(function HorizontalDateSelector({
  selectedDate,
  onSelectDate,
  minDate = startOfDay(new Date()),
  maxDate,
  className,
}: HorizontalDateSelectorProps) {
  const dates = Array.from({ length: 14 }, (_, i) => addDays(minDate, i));
  const today = startOfDay(new Date());

  const handleSelect = useCallback((date: Date) => {
    onSelectDate(date);
  }, [onSelectDate]);

  return (
    <div
      className={cn(
        "flex gap-2 overflow-x-auto pb-4 scrollbar-hide",
        "-mx-4 px-4 sm:mx-0 sm:px-0",
        className
      )}
      role="listbox"
      aria-label="Pilih tanggal main"
    >
      {dates.map((date) => {
        const isSelected = isSameDay(date, selectedDate);
        const isToday = isSameDay(date, today);
        const isPast = isBefore(date, today);
        const disabled = maxDate && isBefore(maxDate, date);

        return (
          <button
            key={date.toISOString()}
            type="button"
            role="option"
            aria-selected={isSelected}
            aria-current={isToday ? "date" : undefined}
            disabled={isPast || disabled}
            onClick={() => !isPast && !disabled && handleSelect(date)}
            className={cn(
              "flex min-w-[68px] flex-col items-center gap-1.5 rounded-[2px] border p-3.5",
              "transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A8A]",
              isSelected
                ? "border-[#141824] bg-[#141824] text-[#FAF9F6]"
                : isToday
                ? "border-[#C84B31]/50 bg-[#C84B31]/10 text-[#C84B31]"
                : "border-[#141824]/25 bg-[#FAF9F6] text-[#141824] hover:border-[#141824] hover:bg-[#EAE6DD]",
              (isPast || disabled) && "cursor-not-allowed opacity-40"
            )}
          >
            <span
              className={cn(
                "font-mono text-[10px] font-semibold uppercase tracking-wider",
                isSelected ? "text-[#EAE6DD]" : isToday ? "text-[#C84B31]" : "text-[#6E6A61]"
              )}
            >
              {format(date, "EEE", { locale: id }).toUpperCase()}
            </span>
            <span
              className={cn(
                "font-mono text-xl font-bold tabular-nums",
                isSelected ? "text-[#FAF9F6]" : "text-[#141824]"
              )}
            >
              {format(date, "d", { locale: id })}
            </span>
            <span
              className={cn(
                "font-mono text-[10px] uppercase",
                isSelected ? "text-[#EAE6DD]" : isToday ? "text-[#C84B31]" : "text-[#6E6A61]"
              )}
            >
              {format(date, "MMM", { locale: id })}
            </span>
          </button>
        );
      })}
    </div>
  );
});