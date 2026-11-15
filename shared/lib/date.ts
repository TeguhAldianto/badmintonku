export const APP_TIME_ZONE = process.env.APP_TIME_ZONE ?? "Asia/Jakarta";

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/** Splits an instant into calendar parts for a given IANA time zone. */
export function getZonedParts(date: Date, timeZone = APP_TIME_ZONE): ZonedParts {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);

  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour"),
    minute: read("minute"),
    second: read("second"),
  };
}

/** Parses a strict `YYYY-MM-DD` string into a UTC-midnight Date. */
export function parseDateOnly(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const match = DATE_ONLY_RE.exec(value.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  const isSameDate =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;

  return isSameDate ? date : null;
}

/** Serializes a Date as `YYYY-MM-DD` using UTC parts (safe for MySQL DATE columns). */
export function toDateOnlyString(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/** Normalizes any Date to UTC midnight of its UTC calendar day. */
export function toDateOnly(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** Serializes the local calendar day of a Date as `YYYY-MM-DD` (for date pickers). */
export function toCalendarDateString(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Builds a local-midnight Date from a `YYYY-MM-DD` string (for date pickers). */
export function parseCalendarDate(value: string): Date | null {
  const dateOnly = parseDateOnly(value);
  if (!dateOnly) return null;
  return new Date(dateOnly.getUTCFullYear(), dateOnly.getUTCMonth(), dateOnly.getUTCDate());
}

/** Returns today's calendar date (UTC midnight) in the application time zone. */
export function todayDateOnly(now = new Date(), timeZone = APP_TIME_ZONE): Date {
  const { year, month, day } = getZonedParts(now, timeZone);
  return new Date(Date.UTC(year, month - 1, day));
}

export function addDaysDateOnly(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function startOfMonthDateOnly(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function startOfYearDateOnly(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
}

/** Compares two date-only values. Returns -1, 0 or 1. */
export function compareDateOnly(a: Date, b: Date): number {
  return Math.sign(toDateOnly(a).getTime() - toDateOnly(b).getTime());
}

/**
 * Converts a date-only value plus an hour in the app time zone into an instant.
 * Example: 2026-12-17 + 20:00 Asia/Jakarta -> 2026-12-17T13:00:00.000Z
 */
export function zonedDateAtHour(
  dateOnly: Date,
  hour: number,
  timeZone = APP_TIME_ZONE
): Date {
  const year = dateOnly.getUTCFullYear();
  const month = dateOnly.getUTCMonth();
  const day = dateOnly.getUTCDate();
  const utcGuess = Date.UTC(year, month, day, hour, 0, 0, 0);
  const offset = getTimeZoneOffsetMs(new Date(utcGuess), timeZone);
  return new Date(utcGuess - offset);
}

function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = getZonedParts(date, timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );
  return asUtc - date.getTime() + date.getMilliseconds();
}
