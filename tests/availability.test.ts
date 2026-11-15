import { describe, test, expect } from "vitest";
import {
  ACTIVE_BOOKING_STATUSES,
  DEFAULT_OPERATING_HOURS,
  checkTimeOverlap,
  generateTimeSlots,
  groupContiguousSlots,
  isWithinOperatingHours,
  normalizeOperatingHours,
} from "@/features/booking/lib/slots";

describe("Availability Engine - Core Logic (pure)", () => {
  describe("generateTimeSlots", () => {
    test("generates slots from 08:00 to 21:00 in 1-hour increments", () => {
      const slots = generateTimeSlots();

      expect(slots).toHaveLength(13); // 8-9, 9-10, ..., 20-21 = 13 slots
      expect(slots[0]).toEqual({ startTime: 8, endTime: 9, status: "AVAILABLE" });
      expect(slots[12]).toEqual({ startTime: 20, endTime: 21, status: "AVAILABLE" });
    });

    test("honours a custom operating hours config", () => {
      const slots = generateTimeSlots({ open: 6, close: 9 });

      expect(slots).toHaveLength(3);
      expect(slots.map((slot) => slot.startTime)).toEqual([6, 7, 8]);
    });
  });

  describe("checkTimeOverlap", () => {
    test("returns true when slots overlap (same hour)", () => {
      expect(checkTimeOverlap(8, 9, 8, 9)).toBe(true);
    });

    test("returns true when slots overlap (partial overlap)", () => {
      expect(checkTimeOverlap(8, 10, 9, 11)).toBe(true); // 8-10 overlaps with 9-11
      expect(checkTimeOverlap(9, 11, 8, 10)).toBe(true); // reverse
      expect(checkTimeOverlap(8, 12, 9, 10)).toBe(true); // contained
    });

    test("returns false when slots are adjacent (boundary)", () => {
      expect(checkTimeOverlap(8, 9, 9, 10)).toBe(false); // 9:00 is boundary
      expect(checkTimeOverlap(9, 10, 8, 9)).toBe(false);
    });

    test("returns false when slots are completely separate", () => {
      expect(checkTimeOverlap(8, 9, 10, 11)).toBe(false);
      expect(checkTimeOverlap(15, 16, 8, 9)).toBe(false);
    });
  });

  describe("operating hours helpers", () => {
    test("DEFAULT_OPERATING_HOURS defines 08:00 - 21:00", () => {
      expect(DEFAULT_OPERATING_HOURS).toEqual({ open: 8, close: 21 });
    });

    test("isWithinOperatingHours rejects out-of-range requests", () => {
      expect(isWithinOperatingHours(8, 9)).toBe(true);
      expect(isWithinOperatingHours(7, 9)).toBe(false);
      expect(isWithinOperatingHours(20, 22)).toBe(false);
      expect(isWithinOperatingHours(10, 10)).toBe(false);
    });

    test("normalizeOperatingHours falls back to defaults for bad config", () => {
      expect(normalizeOperatingHours({ open: 9, close: 22 })).toEqual({ open: 9, close: 22 });
      expect(normalizeOperatingHours({ open: 22, close: 9 })).toEqual(DEFAULT_OPERATING_HOURS);
      expect(normalizeOperatingHours(null)).toEqual(DEFAULT_OPERATING_HOURS);
      expect(normalizeOperatingHours({ open: "8", close: "21" })).toEqual({ open: 8, close: 21 });
    });
  });

  describe("groupContiguousSlots", () => {
    test("merges consecutive hours into one range", () => {
      expect(groupContiguousSlots([8, 9, 10])).toEqual([{ startTime: 8, endTime: 11 }]);
    });

    test("splits non-contiguous hours and de-duplicates", () => {
      expect(groupContiguousSlots([10, 8, 10])).toEqual([
        { startTime: 8, endTime: 9 },
        { startTime: 10, endTime: 11 },
      ]);
    });

    test("returns an empty list for no selection", () => {
      expect(groupContiguousSlots([])).toEqual([]);
    });
  });

  describe("ACTIVE_BOOKING_STATUSES", () => {
    test("includes exactly the statuses that must block a slot", () => {
      expect([...ACTIVE_BOOKING_STATUSES]).toEqual([
        "PENDING_PAYMENT",
        "WAITING_VERIFICATION",
        "CONFIRMED",
      ]);
    });

    test("never blocks slots for terminal statuses", () => {
      expect(ACTIVE_BOOKING_STATUSES).not.toContain("EXPIRED");
      expect(ACTIVE_BOOKING_STATUSES).not.toContain("CANCELLED");
      expect(ACTIVE_BOOKING_STATUSES).not.toContain("REJECTED");
      expect(ACTIVE_BOOKING_STATUSES).not.toContain("COMPLETED");
    });
  });
});
