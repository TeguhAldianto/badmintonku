import { describe, test, expect } from "vitest";
import {
  addDaysDateOnly,
  compareDateOnly,
  parseCalendarDate,
  parseDateOnly,
  toCalendarDateString,
  toDateOnly,
  toDateOnlyString,
  zonedDateAtHour,
} from "@/shared/lib/date";
import { calculateTotal, normalizePricePerHour, DEFAULT_PRICE_PER_HOUR } from "@/features/booking/lib/pricing";

describe("Date helpers (UTC vs local)", () => {
  test("parseDateOnly returns UTC midnight", () => {
    const parsed = parseDateOnly("2026-12-17");
    expect(parsed).not.toBeNull();
    expect(parsed!.toISOString()).toBe("2026-12-17T00:00:00.000Z");
  });

  test("parseDateOnly rejects malformed and impossible dates", () => {
    expect(parseDateOnly("17-12-2026")).toBeNull();
    expect(parseDateOnly("2026-02-30")).toBeNull();
    expect(parseDateOnly("")).toBeNull();
    expect(parseDateOnly(undefined)).toBeNull();
  });

  test("toDateOnlyString serializes UTC parts without shifting the day", () => {
    expect(toDateOnlyString(new Date("2026-12-17T00:00:00.000Z"))).toBe("2026-12-17");
    // A WIB-midnight instant is the previous day in UTC; the helper must not hide that.
    expect(toDateOnlyString(new Date("2026-12-17T00:00:00+07:00"))).toBe("2026-12-16");
  });

  test("toDateOnly strips the time portion", () => {
    expect(toDateOnly(new Date("2026-12-17T18:45:12.000Z")).toISOString()).toBe(
      "2026-12-17T00:00:00.000Z"
    );
  });

  test("compareDateOnly ignores time of day", () => {
    expect(compareDateOnly(new Date("2026-12-17T23:00:00.000Z"), new Date("2026-12-17T01:00:00.000Z"))).toBe(0);
    expect(compareDateOnly(new Date("2026-12-16T23:00:00.000Z"), new Date("2026-12-17T01:00:00.000Z"))).toBe(-1);
    expect(compareDateOnly(new Date("2026-12-18T01:00:00.000Z"), new Date("2026-12-17T23:00:00.000Z"))).toBe(1);
  });

  test("calendar round-trip keeps the same day", () => {
    const dateString = "2026-12-17";
    const local = parseCalendarDate(dateString);
    expect(local).not.toBeNull();
    expect(toCalendarDateString(local!)).toBe(dateString);
  });

  test("addDaysDateOnly crosses month boundaries", () => {
    const start = parseDateOnly("2026-12-31")!;
    expect(toDateOnlyString(addDaysDateOnly(start, 1))).toBe("2027-01-01");
  });

  test("zonedDateAtHour converts WIB wall time to UTC", () => {
    const date = parseDateOnly("2026-12-17")!;
    expect(zonedDateAtHour(date, 20).toISOString()).toBe("2026-12-17T13:00:00.000Z");
  });
});

describe("Pricing helpers", () => {
  test("calculateTotal multiplies duration by price", () => {
    expect(calculateTotal(8, 11, 50_000)).toBe(150_000);
  });

  test("calculateTotal rejects inverted ranges", () => {
    expect(() => calculateTotal(11, 8, 50_000)).toThrow("Jam selesai harus setelah jam mulai");
  });

  test("normalizePricePerHour falls back to the default for invalid values", () => {
    expect(normalizePricePerHour("75000")).toBe(75_000);
    expect(normalizePricePerHour(0)).toBe(DEFAULT_PRICE_PER_HOUR);
    expect(normalizePricePerHour(-1)).toBe(DEFAULT_PRICE_PER_HOUR);
    expect(normalizePricePerHour(undefined)).toBe(DEFAULT_PRICE_PER_HOUR);
  });
});
