import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { BookingStatus, PaymentStatus } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { assertBookingStatusTransition, normalizePhone } from "@/features/booking/server/booking.service";
import {
  notifyPaymentApproved,
  notifyPaymentRejected,
  notifyPaymentSubmitted,
} from "@/features/notification/server/notification.service";
import {
  createSnapToken,
  getSnapRedirectUrl,
  getTransactionStatus,
  type MidtransStatusResponse,
} from "@/features/payment/server/midtrans.gateway";
import { applyMidtransNotification } from "@/features/payment/server/midtrans.webhook";
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  PAYMENT_INSTRUCTIONS,
  PAYMENT_METHODS,
  isPaymentMethod,
  type PaymentMethod,
} from "@/features/payment/constants";
import { AppError, ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/shared/api/errors";

export { ALLOWED_MIME_TYPES, MAX_FILE_SIZE, PAYMENT_INSTRUCTIONS, PAYMENT_METHODS, isPaymentMethod };
export type { PaymentMethod };

export const PAYMENT_STATE = {
  PENDING: PaymentStatus.UNPAID,
  WAITING_VERIFICATION: PaymentStatus.VERIFYING,
  PAID: PaymentStatus.PAID,
  REJECTED: PaymentStatus.REJECTED,
} as const;

export type UploadedImageType = "jpg" | "png" | "webp";

/**
 * Detects the real image type from magic bytes.
 * A client supplied Content-Type is not proof that the file is an image.
 */
export function detectImageType(file: Buffer): UploadedImageType | null {
  if (file.length >= 3 && file[0] === 0xff && file[1] === 0xd8 && file[2] === 0xff) {
    return "jpg";
  }

  const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (file.length >= 8 && pngSignature.every((byte, index) => file[index] === byte)) {
    return "png";
  }

  if (
    file.length >= 12 &&
    file.subarray(0, 4).toString("ascii") === "RIFF" &&
    file.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "webp";
  }

  return null;
}

export interface PaymentProofUpload {
  bookingId: string;
  userPhone: string;
  file: Buffer;
  mimeType: string;
  method: PaymentMethod;
}

export async function uploadPaymentProof({
  bookingId,
  userPhone,
  file,
  mimeType,
  method,
}: PaymentProofUpload) {
  if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType)) {
    throw new ValidationError("Format file tidak didukung. Gunakan JPG, PNG, atau WebP.");
  }
  if (file.length === 0) {
    throw new ValidationError("File bukti pembayaran kosong.");
  }
  if (file.length > MAX_FILE_SIZE) {
    throw new ValidationError("Ukuran file maksimal 2MB.");
  }

  const imageType = detectImageType(file);
  if (!imageType) {
    throw new ValidationError("File bukan gambar yang valid (JPG, PNG, atau WebP).");
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { payment: true, court: true },
  });

  if (!booking) throw new NotFoundError("Booking tidak ditemukan");
  if (booking.userPhone !== normalizePhone(userPhone)) {
    throw new ForbiddenError("Tidak memiliki akses ke booking ini");
  }
  if (booking.status !== BookingStatus.PENDING_PAYMENT) {
    throw new ConflictError(`Tidak dapat upload bukti pada status ${booking.status}`);
  }

  const payment = booking.payment;
  if (!payment) throw new NotFoundError("Data pembayaran tidak ditemukan");
  if (payment.status !== PaymentStatus.UNPAID) {
    throw new ConflictError(`Tidak dapat upload bukti pada status ${payment.status}`);
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads", "payments");
  await mkdir(uploadsDir, { recursive: true });

  const fileName = `${bookingId}-${Date.now()}.${imageType}`;
  await writeFile(path.join(uploadsDir, fileName), file);
  const proofUrl = `/uploads/payments/${fileName}`;

  const updatedPayment = await prisma.$transaction(async (tx) => {
    const updated = await tx.payment.update({
      where: { id: payment.id },
      data: { proofUrl, status: PaymentStatus.VERIFYING, method },
    });

    await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.WAITING_VERIFICATION,
        statusHistory: {
          create: {
            oldStatus: BookingStatus.PENDING_PAYMENT,
            newStatus: BookingStatus.WAITING_VERIFICATION,
            changedBy: "USER",
            notes: `Upload bukti pembayaran via ${method}`,
          },
        },
      },
    });

    return updated;
  });

  try {
    await notifyPaymentSubmitted({
      id: bookingId,
      userPhone: booking.userPhone,
      courtName: booking.court.name,
      date: booking.date,
      startTime: booking.startTime,
      endTime: booking.endTime,
    });
  } catch (err) {
    console.error("Payment submitted notification failed (non-blocking):", err);
  }

  return updatedPayment;
}

export interface AdminPaymentAction {
  paymentId: string;
  action: "APPROVE" | "REJECT";
  adminId: string;
  rejectionReason?: string;
}

export async function processPaymentAdmin({
  paymentId,
  action,
  adminId,
  rejectionReason,
}: AdminPaymentAction) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { booking: { include: { court: true } } },
  });

  if (!payment) throw new NotFoundError("Pembayaran tidak ditemukan");

  if (payment.status !== PaymentStatus.VERIFYING) {
    throw new ConflictError(
      `Pembayaran tidak dalam status menunggu verifikasi (current: ${payment.status})`
    );
  }

  if (payment.booking.status !== BookingStatus.WAITING_VERIFICATION) {
    throw new ConflictError(
      `Booking tidak dalam status menunggu verifikasi (current: ${payment.booking.status})`
    );
  }

  if (action === "REJECT" && !rejectionReason?.trim()) {
    throw new ValidationError("Alasan penolakan wajib diisi");
  }

  const nextBookingStatus =
    action === "APPROVE" ? BookingStatus.CONFIRMED : BookingStatus.REJECTED;

  assertBookingStatusTransition(payment.booking.status, nextBookingStatus);

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: paymentId },
      data:
        action === "APPROVE"
          ? { status: PaymentStatus.PAID, verifiedAt: new Date(), rejectionReason: null }
          : { status: PaymentStatus.REJECTED, rejectionReason },
    });

    await tx.booking.update({
      where: { id: payment.bookingId },
      data: {
        status: nextBookingStatus,
        statusHistory: {
          create: {
            oldStatus: payment.booking.status,
            newStatus: nextBookingStatus,
            changedBy: adminId,
            notes:
              action === "APPROVE"
                ? "Pembayaran diverifikasi oleh admin"
                : `Pembayaran ditolak: ${rejectionReason}`,
          },
        },
      },
    });
  });

  const notification = {
    id: payment.bookingId,
    userPhone: payment.booking.userPhone,
    courtName: payment.booking.court.name,
    date: payment.booking.date,
    startTime: payment.booking.startTime,
    endTime: payment.booking.endTime,
  };

  try {
    if (action === "APPROVE") {
      await notifyPaymentApproved(notification);
    } else {
      await notifyPaymentRejected({ ...notification, reason: rejectionReason ?? "Ditolak admin" });
    }
  } catch (err) {
    console.error("Payment notification failed (non-blocking):", err);
  }

  return { success: true, bookingStatus: nextBookingStatus };
}

export async function getPaymentWithProof(paymentId: string, userPhone?: string, isAdmin = false) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { booking: { include: { court: true } } },
  });

  if (!payment) throw new NotFoundError("Pembayaran tidak ditemukan");

  if (!isAdmin && payment.booking.userPhone !== normalizePhone(userPhone ?? "")) {
    throw new ForbiddenError("Tidak memiliki akses");
  }

  return payment;
}

/**
 * Creates a Snap token for a guest booking.
 * The guest must prove ownership with the phone number used at booking time.
 */
export async function createMidtransPayment(bookingId: string, userPhone: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { payment: true },
  });

  if (!booking) throw new NotFoundError("Booking tidak ditemukan");
  if (booking.userPhone !== normalizePhone(userPhone)) {
    throw new ForbiddenError("Nomor HP tidak cocok dengan booking ini");
  }
  if (booking.status !== BookingStatus.PENDING_PAYMENT) {
    throw new ConflictError("Booking tidak dalam status menunggu pembayaran");
  }
  if (booking.expiresAt.getTime() < Date.now()) {
    throw new ConflictError("Waktu pembayaran booking ini sudah habis");
  }
  if (booking.payment && booking.payment.status !== PaymentStatus.UNPAID) {
    throw new ConflictError("Pembayaran sudah diproses");
  }

  const token = await createSnapToken({
    id: booking.id,
    totalPrice: Number(booking.totalPrice),
    userName: booking.userName,
    userPhone: booking.userPhone,
  });

  if (booking.payment) {
    await prisma.payment.update({
      where: { id: booking.payment.id },
      data: { midtransOrderId: booking.id },
    });
  }

  return { token, redirectUrl: getSnapRedirectUrl(token) };
}

export interface MidtransSyncResult {
  success: boolean;
  message: string;
  bookingStatus: BookingStatus;
  paymentStatus: PaymentStatus | null;
}

/**
 * Re-reads the transaction status from Midtrans and applies it locally.
 *
 * Midtrans only calls public notification URLs, so on localhost/staging the webhook
 * never arrives. The guest page calls this after the Snap popup closes so a sandbox
 * demo still settles the booking.
 */
export async function syncMidtransPayment(
  bookingId: string,
  userPhone: string
): Promise<MidtransSyncResult> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { payment: true },
  });

  if (!booking) throw new NotFoundError("Booking tidak ditemukan");
  if (booking.userPhone !== normalizePhone(userPhone)) {
    throw new ForbiddenError("Nomor HP tidak cocok dengan booking ini");
  }
  if (!booking.payment) throw new ConflictError("Booking ini tidak memiliki data pembayaran");

  if (!booking.payment.midtransOrderId) {
    return {
      success: false,
      message: "Booking ini belum dibuatkan transaksi Midtrans",
      bookingStatus: booking.status,
      paymentStatus: booking.payment.status,
    };
  }

  let status: MidtransStatusResponse;
  try {
    status = await getTransactionStatus(booking.id);
  } catch (error) {
    console.error(`Failed to fetch Midtrans status for ${booking.id}:`, error);
    throw new AppError("Gagal mengambil status transaksi dari Midtrans", 502);
  }

  if (!status?.transaction_status) {
    return {
      success: false,
      message: "Status transaksi Midtrans tidak valid",
      bookingStatus: booking.status,
      paymentStatus: booking.payment.status,
    };
  }

  const result = await applyMidtransNotification({
    order_id: booking.id,
    transaction_id: status.transaction_id ?? booking.payment.midtransTransactionId ?? "",
    transaction_status: status.transaction_status,
    gross_amount: status.gross_amount ?? String(booking.totalPrice),
    payment_type: status.payment_type ?? "",
    fraud_status: status.fraud_status,
    status_code: status.status_code ?? "0",
    currency: status.currency ?? "IDR",
  });

  const fresh = await prisma.booking.findUnique({
    where: { id: booking.id },
    include: { payment: true },
  });

  return {
    success: result.success,
    message: result.message,
    bookingStatus: fresh?.status ?? booking.status,
    paymentStatus: fresh?.payment?.status ?? booking.payment.status,
  };
}
