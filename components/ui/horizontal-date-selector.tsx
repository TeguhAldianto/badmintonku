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
              "flex flex-col items-center gap-1.5 min-w-[60px] p-3 rounded-xl",
              "transition-all duration-200 active:scale-95",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              isSelected
                ? "bg-primary text-white shadow-lg"
                : isToday
                ? "bg-primary/10 text-primary border border-primary/30"
                : "bg-surface text-text hover:bg-primary/5 hover:border-primary/20 border border-border",
              isPast && "opacity-40 cursor-not-allowed",
              disabled && "opacity-40 cursor-not-allowed"
            )}
          >
            <span
              className={cn(
                "text-xs font-medium",
                isSelected ? "text-white" : isToday ? "text-primary" : "text-muted"
              )}
            >
              {format(date, "EEE", { locale: id }).toUpperCase()}
            </span>
            <span
              className={cn(
                "text-2xl font-bold tabular-nums",
                isSelected ? "text-white" : "text-text"
              )}
            >
              {format(date, "d", { locale: id })}
            </span>
            <span
              className={cn(
                "text-xs",
                isSelected ? "text-white/80" : isToday ? "text-primary" : "text-muted"
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