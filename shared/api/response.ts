import { NextResponse } from "next/server";
import { AppError } from "@/shared/api/errors";

export function ok<T>(data: T, status = 200, meta?: Record<string, unknown>) {
  return NextResponse.json(meta ? { success: true, data, meta } : { success: true, data }, { status });
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ success: false, message }, { status });
}

export function handleRouteError(error: unknown, fallback = "Terjadi kesalahan pada server") {
  if (error instanceof AppError) {
    return fail(error.message, error.status);
  }

  const status = (error as { status?: number } | null)?.status;
  if (status === 403) {
    return fail("Forbidden", 403);
  }

  // Prisma error codes: P2025 = record not found, P2002 = unique constraint.
  const code = (error as { code?: string } | null)?.code;
  if (code === "P2025") {
    return fail("Data tidak ditemukan", 404);
  }
  if (code === "P2002") {
    return fail("Data sudah ada", 409);
  }

  console.error("[api]", error);
  return fail(fallback, 500);
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new AppError("Body JSON tidak valid", 400);
  }
}
