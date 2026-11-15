import type { OperatingHours, SlotStatus, TimeSlot } from "@/features/booking/types";

export const DEFAULT_OPERATING_HOURS: OperatingHours = { open: 8, close: 21 };

export const ACTIVE_BOOKING_STATUSES = [
  "PENDING_PAYMENT",
  "WAITING_VERIFICATION",
  "CONFIRMED",
] as const;

export const SLOT_STATUS_CONFIG: Record<SlotStatus, { label: string; className: string }> = {
  AVAILABLE: { label: "Tersedia", className: "bg-[#FAF9F6] text-[#141824] border-[#141824]/25" },
  SELECTED: { label: "Dipilih", className: "bg-[#C84B31] text-[#FAF9F6] border-[#141824]" },
  BOOKED: { label: "Terisi", className: "slot-occupied text-[#6E6A61] border-[#141824]/25" },
  PENDING: { label: "Pending", className: "bg-[#C84B31]/10 text-[#C84B31] border-[#C84B31]/40" },
  BLOCKED: { label: "Diblokir", className: "slot-occupied text-[#6E6A61] border-[#141824]/20" },
};

/** Validates and normalizes an `operational_hours` config value. */
export function normalizeOperatingHours(value: unknown): OperatingHours {
  if (!value || typeof value !== "object") return DEFAULT_OPERATING_HOURS;

  const candidate = value as { open?: unknown; close?: unknown };
  const open = Number(candidate.open);
  const close = Number(candidate.close);

  const isValid =
    Number.isInteger(open) &&
    Number.isInteger(close) &&
    open >= 0 &&
    close <= 24 &&
    open < close;

  return isValid ? { open, close } : DEFAULT_OPERATING_HOURS;
}

export function generateTimeSlots(hours: OperatingHours = DEFAULT_OPERATING_HOURS): TimeSlot[] {
  const slots: TimeSlot[] = [];
  for (let hour = hours.open; hour < hours.close; hour++) {
    slots.push({ startTime: hour, endTime: hour + 1, status: "AVAILABLE" });
  }
  return slots;
}

/** Overlap formula: (startA < endB) && (endA > startB). */
export function checkTimeOverlap(
  startA: number,
  endA: number,
  startB: number,
  endB: number
): boolean {
  return startA < endB && endA > startB;
}

export function isWithinOperatingHours(
  startTime: number,
  endTime: number,
  hours: OperatingHours = DEFAULT_OPERATING_HOURS
): boolean {
  return startTime >= hours.open && endTime <= hours.close && startTime < endTime;
}

/**
 * Groups selected hours into contiguous ranges.
 * [8, 9, 10] -> [{ startTime: 8, endTime: 11 }]
 * [8, 10]     -> [{ startTime: 8, endTime: 9 }, { startTime: 10, endTime: 11 }]
 */
export function groupContiguousSlots(slots: number[]): Array<{ startTime: number; endTime: number }> {
  const sorted = Array.from(new Set(slots)).sort((a, b) => a - b);
  const groups: Array<{ startTime: number; endTime: number }> = [];

  for (const hour of sorted) {
    const last = groups[groups.length - 1];
    if (last && last.endTime === hour) {
      last.endTime = hour + 1;
    } else {
      groups.push({ startTime: hour, endTime: hour + 1 });
    }
  }

  return groups;
}
