"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import type { SlotStatus } from "@/features/booking/types";

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

const statusConfig: Record<
  SlotStatus,
  { label: string; bg: string; text: string; border: string; icon: React.ReactNode }
> = {
  AVAILABLE: {
    label: "Tersedia",
    bg: "bg-[#FAF9F6] hover:bg-[#EAE6DD]",
    text: "text-[#141824]",
    border: "border-[#141824]/25 hover:border-[#1E3A8A]",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  SELECTED: {
    label: "Dipilih",
    bg: "bg-[#C84B31]",
    text: "text-[#FAF9F6]",
    border: "border-[#141824]",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  BOOKED: {
    label: "Terisi",
    bg: "slot-occupied",
    text: "text-[#6E6A61]",
    border: "border-[#141824]/20",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    ),
  },
  PENDING: {
    label: "Proses",
    bg: "bg-[#C84B31]/10",
    text: "text-[#C84B31]",
    border: "border-[#C84B31]/40",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  BLOCKED: {
    label: "Libur",
    bg: "slot-occupied",
    text: "text-[#6E6A61]",
    border: "border-[#141824]/20",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
        />
      </svg>
    ),
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
  const timeLabel = `${startTime.toString().padStart(2, "0")}:00`;
  const endLabel = `${endTime.toString().padStart(2, "0")}:00`;
  const isInteractive = status === "AVAILABLE" || status === "SELECTED";

  return (
    <button
      type="button"
      disabled={!isInteractive || disabled}
      onClick={onClick}
      className={cn(
        "group flex flex-col items-center justify-center gap-1.5 rounded-[2px] border p-4 transition-colors",
        config.bg,
        config.text,
        config.border,
        isSelected && "border-[#141824]",
        !isInteractive && "cursor-not-allowed opacity-80",
        className
      )}
    >
      <span className="font-mono text-sm font-bold tabular-nums tracking-tight">
        {timeLabel} - {endLabel}
      </span>
      <div className="flex items-center gap-1.5 rounded-[2px] border border-current/20 px-2 py-0.5">
        <span className="opacity-80">{config.icon}</span>
        <span className="font-mono text-[10px] font-bold uppercase tracking-wider">
          {config.label}
        </span>
      </div>
      {courtName && (
        <span className="font-mono text-[10px] font-semibold uppercase tracking-wider opacity-60">
          {courtName}
        </span>
      )}
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
  return (
    <div className="space-y-6" data-court-id={courtId}>
      <div className="flex items-center gap-3 border-b border-[#141824]/20 pb-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-[2px] border border-[#141824]/30 bg-[#EAE6DD] text-[#141824]">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </div>
        <div>
          <h3 className="font-display text-lg font-bold tracking-tight text-[#141824]">
            {courtName}
          </h3>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6E6A61]">
            Lapangan pilihan
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {slots.map((slot) => (
          <TimeSlot
            key={`${courtId}-${slot.startTime}`}
            startTime={slot.startTime}
            endTime={slot.endTime}
            status={slot.status}
            isSelected={selectedSlots.includes(slot.startTime)}
            onClick={() => onSlotClick(slot.startTime)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
});
