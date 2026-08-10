import { describe, test, expect, beforeEach } from "vitest";
import { 
  uploadPaymentProof, 
  processPaymentAdmin, 
  getPaymentWithProof,
  PAYMENT_METHODS,
  PAYMENT_STATE,
  VALID_USER_UPLOAD_TRANSITIONS
} from "../services/payment.service";
import { prisma } from "@/lib/prisma";
import { PaymentStatus, BookingStatus } from "@prisma/client";

describe("Payment System", () => {
  const testDate = new Date("2025-12-31T00:00:00.000Z");
  let testBookingId: string;
  let testPaymentId: string;
  const testUserPhone = "08123456789";

  beforeEach(async () => {
    try {
      await prisma.payment.deleteMany({ where: { booking: { userPhone: testUserPhone } } });
      await prisma.booking.deleteMany({ where: { userPhone: testUserPhone } });
    } catch {
      // Ignore cleanup error on concurrent runs
    }

    const booking = await prisma.booking.create({
      data: {
        courtId: 1,
        date: testDate,
        startTime: 10,
        endTime: 11,
        userName: "Test User",
        userPhone: testUserPhone,
        totalPrice: 50000,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        status: BookingStatus.PENDING_PAYMENT,
        payment: {
          create: {
            amount: 50000,
            status: PaymentStatus.UNPAID,
          },
        },
      },
    });

    testBookingId = booking.id;
    const payment = await prisma.payment.findUnique({ where: { bookingId: booking.id } });
    testPaymentId = payment!.id;
  });

  describe("Payment State Machine Constants", () => {
    test("PAYMENT_STATE maps correctly to DB enums", () => {
      expect(PAYMENT_STATE.PENDING).toBe(PaymentStatus.UNPAID);
      expect(PAYMENT_STATE.WAITING_VERIFICATION).toBe(PaymentStatus.VERIFYING);
      expect(PAYMENT_STATE.PAID).toBe(PaymentStatus.PAID);
      expect(PAYMENT_STATE.REJECTED).toBe(PaymentStatus.REJECTED);
    });

    test("VALID_USER_UPLOAD_TRANSITIONS allows UNPAID", () => {
      expect(VALID_USER_UPLOAD_TRANSITIONS).toContain(PaymentStatus.UNPAID);
    });

    test("PAYMENT_METHODS includes all required methods", () => {
      expect(PAYMENT_METHODS).toEqual(["DIRECT", "BANK_TRANSFER", "QRIS"]);
    });
  });

  describe("uploadPaymentProof", () => {
    test("user can upload proof and moves payment to VERIFYING", async () => {
      const mockFile = Buffer.from("fake-image-data");
      
      const payment = await uploadPaymentProof({
        bookingId: testBookingId,
        userPhone: testUserPhone,
        file: mockFile,
        mimeType: "image/jpeg",
        method: "BANK_TRANSFER",
      });

      expect(payment.status).toBe(PaymentStatus.VERIFYING);
      expect(payment.method).toBe("BANK_TRANSFER");
      expect(payment.proofUrl).toBeDefined();
    });

    test("user cannot upload proof for another user's booking", async () => {
      const mockFile = Buffer.from("fake-image-data");
      
      await expect(
        uploadPaymentProof({
          bookingId: testBookingId,
          userPhone: "08999999999",
          file: mockFile,
          mimeType: "image/jpeg",
          method: "BANK_TRANSFER",
        })
      ).rejects.toThrow("Tidak memiliki akses");
    });

    test("user cannot upload proof when payment is not UNPAID (already VERIFYING)", async () => {
      const mockFile = Buffer.from("fake-image-data");
      await uploadPaymentProof({
        bookingId: testBookingId,
        userPhone: testUserPhone,
        file: mockFile,
        mimeType: "image/jpeg",
        method: "BANK_TRANSFER",
      });

      // Second upload should fail
      await expect(
        uploadPaymentProof({
          bookingId: testBookingId,
          userPhone: testUserPhone,
          file: mockFile,
          mimeType: "image/jpeg",
          method: "BANK_TRANSFER",
        })
      ).rejects.toThrow("Tidak dapat upload bukti pada status VERIFYING");
    });

    test("rejects invalid file types (PDF)", async () => {
      const mockFile = Buffer.from("fake-pdf-data");
      
      await expect(
        uploadPaymentProof({
          bookingId: testBookingId,
          userPhone: testUserPhone,
          file: mockFile,
          mimeType: "application/pdf",
          method: "BANK_TRANSFER",
        })
      ).rejects.toThrow("Format file tidak didukung");
    });

    test("rejects files over 2MB", async () => {
      const largeFile = Buffer.alloc(3 * 1024 * 1024);
      
      await expect(
        uploadPaymentProof({
          bookingId: testBookingId,
          userPhone: testUserPhone,
          file: largeFile,
          mimeType: "image/jpeg",
          method: "BANK_TRANSFER",
        })
      ).rejects.toThrow("Ukuran file maksimal 2MB");
    });
  });

  describe("processPaymentAdmin", () => {
    test("admin can approve payment (VERIFYING -> PAID)", async () => {
      const mockFile = Buffer.from("fake-image-data");
      await uploadPaymentProof({
        bookingId: testBookingId,
        userPhone: testUserPhone,
        file: mockFile,
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
      const mockFile = Buffer.from("fake-image-data");
      await uploadPaymentProof({
        bookingId: testBookingId,
        userPhone: testUserPhone,
        file: mockFile,
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

    test("admin cannot approve payment that is not VERIFYING", async () => {
      await expect(
        processPaymentAdmin({
          paymentId: testPaymentId,
          action: "APPROVE",
          adminId: "admin-1",
        })
      ).rejects.toThrow("tidak dalam status menunggu verifikasi");
    });

    test("admin cannot reject without reason", async () => {
      const mockFile = Buffer.from("fake-image-data");
      await uploadPaymentProof({
        bookingId: testBookingId,
        userPhone: testUserPhone,
        file: mockFile,
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

  describe("getPaymentWithProof - Ownership & Authorization", () => {
    test("user can access own payment", async () => {
      const payment = await getPaymentWithProof(testPaymentId, testUserPhone, false);
      expect(payment.id).toBe(testPaymentId);
    });

    test("user cannot access another user's payment", async () => {
      await expect(
        getPaymentWithProof(testPaymentId, "08999999999", false)
      ).rejects.toThrow("Tidak memiliki akses");
    });

    test("admin can access any payment", async () => {
      const payment = await getPaymentWithProof(testPaymentId, "08999999999", true);
      expect(payment.id).toBe(testPaymentId);
    });
  });
});