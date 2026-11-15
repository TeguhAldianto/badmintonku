import type { Session } from "next-auth";
import { auth } from "@/auth";

export type AdminSession = Session;

/** Returns the session only when the current user is an admin. */
export async function getAdminSession(): Promise<AdminSession | null> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return null;
  return session;
}

/** Throws a 403-mappable error when the current user is not an admin. */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) {
    const error = new Error("Forbidden: admin only");
    (error as Error & { status?: number }).status = 403;
    throw error;
  }
  return session;
}
