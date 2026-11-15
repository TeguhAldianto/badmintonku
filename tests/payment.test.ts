import { describe, test, expect, beforeEach, afterAll } from "vitest";
import { readdir, unlink } from "node:fs/promises";
import path from "node:path";
import { PaymentStatus, BookingStatus } from "@prisma/client";
import {
  detectImageType,
  getPaymentWithProof,
  processPaymentAdmin,
  uploadPaymentProof,
  PAYMENT_STATE,
} from "@/features/payment/server/payment.service";
import { PAYMENT_METHODS, isPaymentMethod } from "@/features/payment/constants";
import { prisma } from "@/server/db/prisma";

function futureDateOnly(daysAhead = 7): Date {
  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return new Date(todayUtc + daysAhead * 24 * 60 * 60 * 1000);
}

/** Minimal valid JPEG magic bytes; the service verifies real image content, not the MIME header. */
function jpegBuffer(): Buffer {
  return Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32, 0x00)]);
}

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads", "payments");

describe("Payment System", () => {
  const testDate = futureDateOnly(9);
  const testUserPhone = "08123456789";
  const createdBookingIds: string[] = [];
  let testBookingId: string;
  let testPaymentId: string;

  beforeEach(async () => {
    await prisma.payment.deleteMany({ where: { booking: { userPhone: testUserPhone } } });
    await prisma.booking.deleteMany({ where: { userPhone: testUserPhone } });

    const booking = await prisma.booking.create({
      data: {
        courtId: 1,
        date: testDate,
        startTime: 10,
        endTime: 11,
        userName: "Test User",
        userPhone: testUserPhone,
        totalPrice: 50_000,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        status: BookingStatus.PENDING_PAYMENT,
        payment: { create: { amount: 50_000, status: PaymentStatus.UNPAID } },
      },
    });

    testBookingId = booking.id;
    createdBookingIds.push(booking.id);
    const payment = await prisma.payment.findUnique({ where: { bookingId: booking.id } });
    testPaymentId = payment!.id;
  });

  afterAll(async () => {
    try {
      const files = await readdir(UPLOADS_DIR);
      await Promise.all(
        files
          .filter((file) => createdBookingIds.some((id) => file.startsWith(id)))
          .map((file) => unlink(path.join(UPLOADS_DIR, file)).catch(() => undefined))
      );
    } catch {
      // Upload directory may not exist when no test wrote a file.
    }
  });

  describe("Payment state constants", () => {
    test("PAYMENT_STATE maps correctly to DB enums", () => {
      expect(PAYMENT_STATE.PENDING).toBe(PaymentStatus.UNPAID);
      expect(PAYMENT_STATE.WAITING_VERIFICATION).toBe(PaymentStatus.VERIFYING);
      expect(PAYMENT_STATE.PAID).toBe(PaymentStatus.PAID);
      expect(PAYMENT_STATE.REJECTED).toBe(PaymentStatus.REJECTED);
    });

    test("PAYMENT_METHODS includes all required methods", () => {
      expect([...PAYMENT_METHODS]).toEqual(["DIRECT", "BANK_TRANSFER", "QRIS"]);
      expect(isPaymentMethod("BANK_TRANSFER")).toBe(true);
      expect(isPaymentMethod("CRYPTO")).toBe(false);
    });
  });

  describe("detectImageType", () => {
    test("detects JPEG, PNG and WebP from magic bytes", () => {
      expect(detectImageType(jpegBuffer())).toBe("jpg");
      expect(detectImageType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("png");
      expect(
        detectImageType(Buffer.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]))
      ).toBe("webp");
    });

    test("rejects non-image content", () => {
      expect(detectImageType(Buffer.from("fake-image-data"))).toBeNull();
    });
  });

  describe("uploadPaymentProof", () => {
    test("user can upload proof and moves payment to VERIFYING", async () => {
      const payment = await uploadPaymentProof({
        bookingId: testBookingId,
        userPhone: testUserPhone,
        file: jpegBuffer(),
        mimeType: "image/jpeg",
        method: "BANK_TRANSFER",
      });

      expect(payment.status).toBe(PaymentStatus.VERIFYING);
      expect(payment.method).toBe("BANK_TRANSFER");
      expect(payment.proofUrl).toMatch(/^\/uploads\/payments\/.+\.jpg$/);

      const booking = await prisma.booking.findUnique({ where: { id: testBookingId } });
      expect(booking?.status).toBe(BookingStatus.WAITING_VERIFICATION);
    });

    test("user cannot upload proof for another user's booking", async () => {
      await expect(
        uploadPaymentProof({
          bookingId: testBookingId,
          userPhone: "08999999999",
          file: jpegBuffer(),
          mimeType: "image/jpeg",
          method: "BANK_TRANSFER",
        })
      ).rejects.toThrow("Tidak memiliki akses ke booking ini");
    });

    test("user cannot upload proof twice", async () => {
      await uploadPaymentProof({
        bookingId: testBookingId,
        userPhone: testUserPhone,
        file: jpegBuffer(),
        mimeType: "image/jpeg",
        method: "BANK_TRANSFER",
      });

      await expect(
        uploadPaymentProof({
          bookingId: testBookingId,
          userPhone: testUserPhone,
          file: jpegBuffer(),
          mimeType: "image/jpeg",
          method: "BANK_TRANSFER",
        })
      ).rejects.toThrow(/Tidak dapat upload bukti/);
    });

    test("rejects an unsupported MIME type (PDF)", async () => {
      await expect(
        uploadPaymentProof({
          bookingId: testBookingId,
          userPhone: testUserPhone,
          file: jpegBuffer(),
          mimeType: "application/pdf",
          method: "BANK_TRANSFER",
        })
      ).rejects.toThrow("Format file tidak didukung");
    });

    test("rejects a file that is not a real image", async () => {
      await expect(
        uploadPaymentProof({
          bookingId: testBookingId,
          userPhone: testUserPhone,
          file: Buffer.from("fake-image-data"),
          mimeType: "image/jpeg",
          method: "BANK_TRANSFER",
        })
      ).rejects.toThrow("File bukan gambar yang valid");
    });

    test("rejects files over 2MB", async () => {
      await expect(
        uploadPaymentProof({
          bookingId: testBookingId,
          userPhone: testUserPhone,
          file: Buffer.alloc(3 * 1024 * 1024),
          mimeType: "image/jpeg",
          method: "BANK_TRANSFER",
        })
      ).rejects.toThrow("Ukuran file maksimal 2MB");
    });
  });

  describe("processPaymentAdmin", () => {
    test("admin can approve payment (VERIFYING -> PAID)", async () => {
      await uploadPaymentProof({
        bookingId: testBookingId,
        userPhone: testUserPhone,
        file: jpegBuffer(),
        mimeType: "image/jpeg",
        method: "BANK_TRANSFER",
      });

      const result = await processPaymentAdmin({
        paymentId: testPaymentId,
        action: "APPROVE",
        adminId: "admin-1",
      });

      expect(result.success).toBe(true);

      const payment = await prisma.payment.findUnique({ where: { id: testPaymentId } });
      expect(payment?.status).toBe(PaymentStatus.PAID);
      expect(payment?.verifiedAt).toBeDefined();

      const booking = await prisma.booking.findUnique({ where: { id: testBookingId } });
      expect(booking?.status).toBe(BookingStatus.CONFIRMED);
    });

    test("admin can reject payment with reason (VERIFYING -> REJECTED)", async () => {
      await uploadPaymentProof({
        bookingId: testBookingId,
        userPhone: testUserPhone,
        file: jpegBuffer(),
        mimeType: "image/jpeg",
        method: "BANK_TRANSFER",
      });

      const result = await processPaymentAdmin({
        paymentId: testPaymentId,
        action: "REJECT",
        adminId: "admin-1",
        rejectionReason: "Bukti transfer tidak valid",
      });

      expect(result.success).toBe(true);

      const payment = await prisma.payment.findUnique({ where: { id: testPaymentId } });
      expect(payment?.status).toBe(PaymentStatus.REJECTED);
      expect(payment?.rejectionReason).toBe("Bukti transfer tidak valid");

      const booking = await prisma.booking.findUnique({ where: { id: testBookingId } });
      expect(booking?.status).toBe(BookingStatus.REJECTED);
    });

    test("admin cannot approve a payment that is not VERIFYING", async () => {
      await expect(
        processPaymentAdmin({
          paymentId: testPaymentId,
          action: "APPROVE",
          adminId: "admin-1",
        })
      ).rejects.toThrow("tidak dalam status menunggu verifikasi");
    });

    test("admin cannot reject without a reason", async () => {
      await uploadPaymentProof({
        bookingId: testBookingId,
        userPhone: testUserPhone,
        file: jpegBuffer(),
        mimeType: "image/jpeg",
        method: "BANK_TRANSFER",
      });

      await expect(
        processPaymentAdmin({
          paymentId: testPaymentId,
          action: "REJECT",
          adminId: "admin-1",
        })
      ).rejects.toThrow("Alasan penolakan wajib diisi");
    });
  });

  describe("getPaymentWithProof - ownership", () => {
    test("user can access own payment", async () => {
      const payment = await getPaymentWithProof(testPaymentId, testUserPhone, false);
      expect(payment.id).toBe(testPaymentId);
    });

    test("user cannot access another user's payment", async () => {
      await expect(getPaymentWithProof(testPaymentId, "08999999999", false)).rejects.toThrow(
        "Tidak memiliki akses"
      );
    });

    test("admin can access any payment", async () => {
      const payment = await getPaymentWithProof(testPaymentId, "08999999999", true);
      expect(payment.id).toBe(testPaymentId);
    });
  });
});
