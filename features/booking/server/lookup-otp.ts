import { createHash, randomInt, timingSafeEqual } from "node:crypto";

// shortcut: codes live in process memory; move to DB/Redis before running more than one instance.
const OTP_TTL_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

interface OtpEntry {
  hash: Buffer;
  expiresAt: number;
  sentAt: number;
  attempts: number;
}

const store = new Map<string, OtpEntry>();

function hashCode(phone: string, code: string): Buffer {
  return createHash("sha256").update(`${phone}:${code}`).digest();
}

/** Returns the code to send, or null while the resend cooldown is still active. */
export function createLookupOtp(phone: string): string | null {
  const now = Date.now();
  const existing = store.get(phone);
  if (existing && now - existing.sentAt < RESEND_COOLDOWN_MS) return null;

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  store.set(phone, {
    hash: hashCode(phone, code),
    expiresAt: now + OTP_TTL_MS,
    sentAt: now,
    attempts: 0,
  });
  return code;
}

export function verifyLookupOtp(phone: string, code: string): boolean {
  const entry = store.get(phone);
  if (!entry) return false;

  if (Date.now() > entry.expiresAt) {
    store.delete(phone);
    return false;
  }

  entry.attempts += 1;
  if (entry.attempts > MAX_ATTEMPTS) {
    store.delete(phone);
    return false;
  }

  if (!timingSafeEqual(entry.hash, hashCode(phone, code.trim()))) return false;

  store.delete(phone);
  return true;
}
