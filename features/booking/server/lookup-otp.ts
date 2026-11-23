import { createHash, randomInt, timingSafeEqual } from "node:crypto";

import { prisma } from "@/server/db/prisma";

const OTP_TTL_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

function hashCode(phone: string, code: string): string {
  return createHash("sha256").update(`${phone}:${code}`).digest("hex");
}

/** Returns the code to send, or null while the resend cooldown is still active. */
export async function createLookupOtp(phone: string): Promise<string | null> {
  const now = new Date();
  const existing = await prisma.lookupOtp.findUnique({ where: { phone } });

  if (existing && now.getTime() - existing.sentAt.getTime() < RESEND_COOLDOWN_MS) {
    return null;
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await prisma.lookupOtp.upsert({
    where: { phone },
    create: {
      phone,
      codeHash: hashCode(phone, code),
      expiresAt: new Date(now.getTime() + OTP_TTL_MS),
      sentAt: now,
      attempts: 0,
    },
    update: {
      codeHash: hashCode(phone, code),
      expiresAt: new Date(now.getTime() + OTP_TTL_MS),
      sentAt: now,
      attempts: 0,
    },
  });

  return code;
}

export async function verifyLookupOtp(phone: string, code: string): Promise<boolean> {
  const entry = await prisma.lookupOtp.findUnique({ where: { phone } });
  if (!entry) return false;

  if (Date.now() > entry.expiresAt.getTime()) {
    await prisma.lookupOtp.delete({ where: { phone } }).catch(() => undefined);
    return false;
  }

  const attempts = entry.attempts + 1;
  if (attempts > MAX_ATTEMPTS) {
    await prisma.lookupOtp.delete({ where: { phone } }).catch(() => undefined);
    return false;
  }

  const ok = timingSafeEqual(
    Buffer.from(entry.codeHash, "hex"),
    Buffer.from(hashCode(phone, code.trim()), "hex")
  );

  if (ok) {
    await prisma.lookupOtp.delete({ where: { phone } }).catch(() => undefined);
    return true;
  }

  await prisma.lookupOtp.update({
    where: { phone },
    data: { attempts },
  });
  return false;
}
