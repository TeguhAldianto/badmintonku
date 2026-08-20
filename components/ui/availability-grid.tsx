"use client";

import { memo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { SlotStatus } from "@/lib/booking";

interface TimeSlotProps {
  startTime: number;
  endTime: number;
  status: SlotStatus;
  courtName?: string;
  isSelected: boolean;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

const statusConfig: Record<SlotStatus, { label: string; bg: string; text: string; border: string; icon: string }> = {
  AVAILABLE: {
    label: "Tersedia",
    bg: "bg-green-50",
    text: "text-green-700",
    border: "border-green-200",
    icon: "✓",
  },
  SELECTED: {
    label: "Dipilih",
    bg: "bg-primary",
    text: "text-white",
    border: "border-primary",
    icon: "✓",
  },
  BOOKED: {
    label: "Terisi",
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    icon: "✕",
  },
  PENDING: {
    label: "Pending",
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    border: "border-yellow-200",
    icon: "⏳",
  },
  BLOCKED: {
    label: "Diblokir",
    bg: "bg-gray-100",
    text: "text-gray-500",
    border: "border-gray-200",
    icon: "🚫",
  },
};

export const TimeSlot = memo(function TimeSlot({
  startTime,
  endTime,
  status,
  courtName,
  isSelected,
  onClick,
  disabled = false,
  className,
}: TimeSlotProps) {
  const config = statusConfig[status];
  const timeLabel = `${startTime.toString().padStart(2, "0")}:00 – ${endTime.toString().padStart(2, "0")}:00`;
  const isInteractive = status === "AVAILABLE" || status === "SELECTED";

  return (
    <button
      type="button"
      role={isInteractive ? "button" : "status"}
      aria-pressed={isSelected}
      aria-label={`${timeLabel}, ${config.label}`}
      disabled={!isInteractive || disabled}
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-1 p-3 min-h-[80px] rounded-xl border-2 transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        "active:scale-[0.98]",
        config.bg,
        config.text,
        config.border,
        isSelected && "shadow-lg ring-2 ring-primary/20",
        !isInteractive && "opacity-60 cursor-not-allowed",
        disabled && "opacity-40 cursor-not-allowed",
        className
      )}
    >
      <span className="font-mono text-sm font-medium tabular-nums">{timeLabel}</span>
      <div className="flex items-center gap-1">
        <span className="text-xs">{config.icon}</span>
        <span className="text-xs font-medium capitalize">{config.label}</span>
      </div>
      {courtName && <span className="text-xs opacity-70">{courtName}</span>}
    </button>
  );
});

interface CourtAvailabilityGridProps {
  courtId: number;
  courtName: string;
  slots: Array<{ startTime: number; endTime: number; status: SlotStatus }>;
  selectedSlots: number[];
  onSlotClick: (startTime: number) => void;
  disabled?: boolean;
}

export const CourtAvailabilityGrid = memo(function CourtAvailabilityGrid({
  courtId,
  courtName,
  slots,
  selectedSlots,
  onSlotClick,
  disabled = false,
}: CourtAvailabilityGridProps) {
  const handleClick = useCallback((startTime: number) => {
    onSlotClick(startTime);
  }, [onSlotClick]);

  return (
    <div className="space-y-4" data-court-id={courtId}>
      <div className="flex items-center gap-3 px-2">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <span className="text-primary font-bold text-lg">🏸</span>
        </div>
        <h3 className="font-semibold text-text">{courtName}</h3>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {slots.map((slot) => (
          <TimeSlot
            key={`${courtId}-${slot.startTime}`}
            startTime={slot.startTime}
            endTime={slot.endTime}
            status={slot.status}
            isSelected={selectedSlots.includes(slot.startTime)}
            onClick={() => handleClick(slot.startTime)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
});