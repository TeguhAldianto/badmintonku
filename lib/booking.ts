export type SlotStatus = "AVAILABLE" | "SELECTED" | "BOOKED" | "PENDING" | "BLOCKED";

export interface TimeSlot {
  startTime: number; // 8-20
  endTime: number; // 9-21
  status: SlotStatus;
}

export interface Court {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
}

export interface BookingStep {
  step: number;
  title: string;
  description: string;
}

export const BOOKING_STEPS: BookingStep[] = [
  { step: 1, title: "Tanggal", description: "Pilih tanggal main" },
  { step: 2, title: "Lapangan", description: "Pilih lapangan" },
  { step: 3, title: "Jam", description: "Pilih jam main" },
  { step: 4, title: "Summary", description: "Ringkasan booking" },
  { step: 5, title: "Payment", description: "Pembayaran" },
  { step: 6, title: "Confirmation", description: "Konfirmasi" },
];

export const OPERATING_HOURS = {
  OPEN: 8,
  CLOSE: 21,
};

export function generateTimeSlots(): TimeSlot[] {
  const slots: TimeSlot[] = [];
  for (let h = OPERATING_HOURS.OPEN; h < OPERATING_HOURS.CLOSE; h++) {
    slots.push({
      startTime: h,
      endTime: h + 1,
      status: "AVAILABLE",
    });
  }
  return slots;
}

export function formatTimeSlot(slot: TimeSlot): string {
  const start = slot.startTime.toString().padStart(2, "0");
  const end = slot.endTime.toString().padStart(2, "0");
  return `${start}:00 – ${end}:00`;
}

export function formatDateIndo(date: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatDateInput(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function parseDateInput(dateStr: string): Date {
  return new Date(dateStr + "T00:00:00");
}

export const SLOT_STATUS_CONFIG: Record<SlotStatus, { label: string; className: string }> = {
  AVAILABLE: { label: "Tersedia", className: "bg-green-100 text-green-800 border-green-200" },
  SELECTED: { label: "Dipilih", className: "bg-primary text-white border-primary" },
  BOOKED: { label: "Terisi", className: "bg-red-100 text-red-800 border-red-200" },
  PENDING: { label: "Pending", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  BLOCKED: { label: "Diblokir", className: "bg-gray-100 text-gray-500 border-gray-200" },
};

export function getSlotStatusClass(status: SlotStatus): string {
  return SLOT_STATUS_CONFIG[status].className;
}

export function getSlotStatusLabel(status: SlotStatus): string {
  return SLOT_STATUS_CONFIG[status].label;
}