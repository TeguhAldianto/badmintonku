import { readFile } from "node:fs/promises";

import { prisma } from "@/server/db/prisma";
import { getAdminSession } from "@/server/auth/guards";
import {
  isPaymentMethod,
  proofContentType,
  resolveProofPath,
  uploadPaymentProof,
} from "@/features/payment/server/payment.service";
import { normalizePhone } from "@/features/booking/server/booking.service";
import { fail, handleRouteError, ok } from "@/shared/api/response";

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const formData = await request.formData();
    const file = formData.get("file");
    const method = formData.get("method");
    const userPhone = formData.get("userPhone");

    if (!(file instanceof File) || typeof method !== "string" || typeof userPhone !== "string") {
      return fail("File, metode pembayaran, dan nomor HP wajib diisi", 400);
    }
    if (!isPaymentMethod(method)) {
      return fail("Metode pembayaran tidak valid", 400);
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return fail("Ukuran file maksimal 2MB", 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const payment = await uploadPaymentProof({
      bookingId: id,
      userPhone,
      file: buffer,
      mimeType: file.type,
      method,
    });

    return ok(payment);
  } catch (error) {
    return handleRouteError(error, "Gagal upload bukti pembayaran");
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const isAdmin = Boolean(await getAdminSession());
    const phone = new URL(request.url).searchParams.get("phone") ?? undefined;

    const payment =
      (await prisma.payment.findUnique({
        where: { id },
        include: { booking: { select: { userPhone: true } } },
      })) ??
      (await prisma.payment.findUnique({
        where: { bookingId: id },
        include: { booking: { select: { userPhone: true } } },
      }));

    if (!payment) return fail("Pembayaran tidak ditemukan", 404);
    if (!isAdmin && payment.booking.userPhone !== normalizePhone(phone ?? "")) {
      return fail("Tidak memiliki akses", 403);
    }
    if (!payment.proofUrl) return fail("Bukti pembayaran tidak ditemukan", 404);

    const filePath = resolveProofPath(payment.proofUrl);
    if (!filePath) return fail("Bukti pembayaran tidak ditemukan", 404);

    const file = await readFile(filePath);
    return new Response(file, {
      headers: {
        "Content-Type": proofContentType(filePath),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return handleRouteError(error, "Gagal mengambil bukti pembayaran");
  }
}
