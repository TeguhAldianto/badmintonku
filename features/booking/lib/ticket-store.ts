export interface LocalTicket {
  code: string;
  createdAt: string;
}

export const TICKETS_STORAGE_KEY = "badmintonku_tickets_v1";
export const TICKETS_CHANGED_EVENT = "badmintonku:tickets-changed";

function isBrowser() {
  return typeof window !== "undefined";
}

/** Reads ticket codes saved on this device (guest-friendly, no backend required). */
export function readLocalTickets(): LocalTicket[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(TICKETS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is LocalTicket =>
        Boolean(item) && typeof item.code === "string" && typeof item.createdAt === "string"
    );
  } catch {
    return [];
  }
}

function persist(tickets: LocalTicket[]) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(TICKETS_STORAGE_KEY, JSON.stringify(tickets));
    window.dispatchEvent(new CustomEvent(TICKETS_CHANGED_EVENT));
  } catch {
    // Storage can be unavailable (private mode / quota). Fail silently.
  }
}

export function addLocalTicket(code: string): LocalTicket[] {
  const tickets = readLocalTickets().filter((ticket) => ticket.code !== code);
  const next = [{ code, createdAt: new Date().toISOString() }, ...tickets];
  persist(next);
  return next;
}

/** Adds many codes with one storage write and one change event. */
export function addLocalTickets(codes: string[]): LocalTicket[] {
  const unique = new Set(codes);
  const createdAt = new Date().toISOString();
  const next = [
    ...Array.from(unique, (code) => ({ code, createdAt })),
    ...readLocalTickets().filter((ticket) => !unique.has(ticket.code)),
  ];
  persist(next);
  return next;
}

export function removeLocalTicket(code: string): LocalTicket[] {
  const next = readLocalTickets().filter((ticket) => ticket.code !== code);
  persist(next);
  return next;
}
