export type SlotStatus = "AVAILABLE" | "SELECTED" | "BOOKED" | "PENDING" | "BLOCKED";

export interface OperatingHours {
  open: number;
  close: number;
}

export interface TimeSlot {
  startTime: number;
  endTime: number;
  status: SlotStatus;
}

export interface CourtSummary {
  id: number;
  name: string;
  description: string | null;
  pricePerHour: number;
  isActive: boolean;
}

export interface BookingSummary {
  id: string;
  status: string;
  courtName: string;
  date: string;
  startTime: number;
  endTime: number;
  userName: string;
  userPhone: string;
  totalPrice: number;
}
