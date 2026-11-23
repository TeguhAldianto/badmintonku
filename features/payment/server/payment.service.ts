import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { BookingStatus, PaymentStatus } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import {
  assertBookingStatusTransition,
  normalizePhone,
  updateWithStatusGuard,
} from "@/features/booking/server/booking.service";
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
  PAYMENT_METHOD_META,
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
  if (!PAYMENT_METHOD_META[method].requiresProof) {
    throw new ValidationError("Metode pembayaran ini tidak memerlukan unggah bukti.");
  }
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
  if (booking.expiresAt.getTime() < Date.now()) {
    throw new ConflictError("Waktu pembayaran sudah habis");
  }

  const payment = booking.payment;
  if (!payment) throw new NotFoundError("Data pembayaran tidak ditemukan");
  if (payment.status !== PaymentStatus.UNPAID) {
    throw new ConflictError(`Tidak dapat upload bukti pada status ${payment.status}`);
  }
  if (payment.midtransOrderId) {
    throw new ConflictError(
      "Transaksi Midtrans sudah dibuat. Selesaikan pembayaran Midtrans atau tunggu kedaluwarsa."
    );
  }

  const uploadsDir = path.join(process.cwd(), "data", "uploads", "payments");
  await mkdir(uploadsDir, { recursive: true });

  const fileName = `${bookingId}-${Date.now()}.${imageType}`;
  const filePath = path.join(uploadsDir, fileName);
  await writeFile(filePath, file);
  // Stored as a private key; served only by the authenticated proof endpoint.
  const proofUrl = `payments/${fileName}`;

  let updatedPayment;
  try {
    updatedPayment = await prisma.$transaction(async (tx) => {
      const paymentUpdate = await tx.payment.updateMany({
        where: {
          id: payment.id,
          status: PaymentStatus.UNPAID,
          midtransOrderId: null,
        },
        data: { proofUrl, status: PaymentStatus.VERIFYING, method },
      });
      if (paymentUpdate.count === 0) {
        throw new ConflictError("Status pembayaran sudah berubah. Muat ulang lalu coba lagi.");
      }

      const bookingUpdate = await tx.booking.updateMany({
        where: { id: bookingId, status: BookingStatus.PENDING_PAYMENT },
        data: { status: BookingStatus.WAITING_VERIFICATION },
      });
      if (bookingUpdate.count === 0) {
        throw new ConflictError("Status booking sudah berubah. Muat ulang lalu coba lagi.");
      }

      await tx.bookingStatusHistory.create({
        data: {
          bookingId,
          oldStatus: BookingStatus.PENDING_PAYMENT,
          newStatus: BookingStatus.WAITING_VERIFICATION,
          changedBy: "USER",
          notes: `Upload bukti pembayaran via ${method}`,
        },
      });

      return tx.payment.findUniqueOrThrow({ where: { id: payment.id } });
    });
  } catch (error) {
    await unlink(filePath).catch(() => undefined);
    throw error;
  }

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

export interface SelectPaymentMethodInput {
  bookingId: string;
  userPhone: string;
  method: PaymentMethod;
}

/**
 * Stores the guest's chosen settlement method before proof/Midtrans.
 * DIRECT is the only method that can be confirmed by admin without proof.
 */
export async function selectPaymentMethod({
  bookingId,
  userPhone,
  method,
}: SelectPaymentMethodInput) {
  if (!isPaymentMethod(method)) {
    throw new ValidationError("Metode pembayaran tidak valid");
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { payment: true },
  });

  if (!booking) throw new NotFoundError("Booking tidak ditemukan");
  if (booking.userPhone !== normalizePhone(userPhone)) {
    throw new ForbiddenError("Tidak memiliki akses ke booking ini");
  }
  if (booking.status !== BookingStatus.PENDING_PAYMENT) {
    throw new ConflictError(`Tidak dapat mengubah metode pada status ${booking.status}`);
  }
  if (booking.expiresAt.getTime() < Date.now()) {
    throw new ConflictError("Waktu pembayaran sudah habis");
  }

  const payment = booking.payment;
  if (!payment) throw new NotFoundError("Data pembayaran tidak ditemukan");
  if (payment.status !== PaymentStatus.UNPAID) {
    throw new ConflictError("Pembayaran sudah diproses");
  }
  if (payment.midtransOrderId) {
    throw new ConflictError("Transaksi Midtrans sudah dibuat; metode tidak dapat diubah");
  }
  if (payment.proofUrl) {
    throw new ConflictError("Bukti pembayaran sudah diunggah; metode tidak dapat diubah");
  }

  const updated = await prisma.payment.updateMany({
    where: {
      id: payment.id,
      status: PaymentStatus.UNPAID,
      midtransOrderId: null,
      proofUrl: null,
    },
    data: { method },
  });

  if (updated.count === 0) {
    throw new ConflictError("Status pembayaran sudah berubah. Muat ulang lalu coba lagi.");
  }

  return prisma.payment.findUnique({ where: { id: payment.id } });
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
    await updateWithStatusGuard(
      tx.payment.update({
        where: { id: paymentId, status: PaymentStatus.VERIFYING },
        data:
          action === "APPROVE"
            ? { status: PaymentStatus.PAID, verifiedAt: new Date(), rejectionReason: null }
            : { status: PaymentStatus.REJECTED, rejectionReason },
      }),
      "Pembayaran sudah diproses oleh admin lain. Muat ulang lalu coba lagi."
    );

    await updateWithStatusGuard(
      tx.booking.update({
        where: { id: payment.bookingId, status: BookingStatus.WAITING_VERIFICATION },
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
      }),
      "Status booking sudah berubah. Muat ulang lalu coba lagi."
    );
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

export function resolveProofPath(proofUrl: string): string | null {
  if (proofUrl.startsWith("payments/")) {
    const name = path.basename(proofUrl);
    return path.join(process.cwd(), "data", "uploads", "payments", name);
  }
  if (proofUrl.startsWith("/uploads/payments/")) {
    const name = path.basename(proofUrl);
    return path.join(process.cwd(), "public", "uploads", "payments", name);
  }
  return null;
}

export function proofContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return "image/jpeg";
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
  if (booking.payment?.method === "DIRECT") {
    throw new ConflictError("Booking ini memilih Bayar di Tempat. Ubah metode jika ingin membayar via Midtrans.");
  }
  if (booking.payment?.proofUrl) {
    throw new ConflictError("Bukti transfer sudah diunggah. Batalkan atau tunggu verifikasi admin.");
  }

  const token = await createSnapToken({
    id: booking.id,
    totalPrice: Number(booking.totalPrice),
    userName: booking.userName,
    userPhone: booking.userPhone,
  });

  if (booking.payment) {
    const updated = await prisma.payment.updateMany({
      where: { id: booking.payment.id, status: PaymentStatus.UNPAID },
      data: { midtransOrderId: booking.id, method: "QRIS" },
    });
    if (updated.count === 0) {
      throw new ConflictError("Status pembayaran sudah berubah. Muat ulang lalu coba lagi.");
    }
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
