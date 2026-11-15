export const PAYMENT_METHODS = ["DIRECT", "BANK_TRANSFER", "QRIS"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_INSTRUCTIONS: Record<PaymentMethod, string> = {
  DIRECT: "Bayar langsung ke admin saat check-in",
  BANK_TRANSFER: "Transfer ke BCA 1234567890 a.n. BadmintonKu",
  QRIS: "Scan QRIS yang tersedia di halaman pembayaran",
};

export const MAX_FILE_SIZE = 2 * 1024 * 1024;
export const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export function isPaymentMethod(value: string): value is PaymentMethod {
  return (PAYMENT_METHODS as readonly string[]).includes(value);
}
