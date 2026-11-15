import { toDateOnlyString } from "@/shared/lib/date";

/** Formats a date-only value (stored as UTC midnight) without shifting the day. */
export function formatDateIndo(date: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatDateShort(date: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatTimeSlot(slot: { startTime: number; endTime: number }): string {
  const start = slot.startTime.toString().padStart(2, "0");
  const end = slot.endTime.toString().padStart(2, "0");
  return `${start}:00 – ${end}:00`;
}

export function formatCurrency(value: number | string): string {
  return `Rp ${Number(value).toLocaleString("id-ID")}`;
}

export function formatDateInput(date: Date): string {
  return toDateOnlyString(date);
}

export function maskPhone(phone: string): string {
  if (phone.length <= 6) return "****";
  return `${phone.slice(0, 4)}****${phone.slice(-3)}`;
}
