export const PAYMENT_METHODS = ["DIRECT", "BANK_TRANSFER", "QRIS"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  DIRECT: "Bayar di Tempat",
  BANK_TRANSFER: "Transfer Bank",
  QRIS: "QRIS",
};

/**
 * How each method is actually settled. Only BANK_TRANSFER needs a manual proof upload;
 * QRIS is settled through the Midtrans Snap popup, and DIRECT is paid at the venue.
 */
export const PAYMENT_METHOD_META: Record<
  PaymentMethod,
  { label: string; description: string; requiresProof: boolean; requiresMidtrans: boolean }
> = {
  BANK_TRANSFER: {
    label: "Transfer Bank",
    description: "Transfer ke rekening BCA arena, lalu unggah bukti transfer di bawah.",
    requiresProof: true,
    requiresMidtrans: false,
  },
  QRIS: {
    label: "QRIS",
    description:
      "Gunakan tombol “Bayar sekarang via Midtrans”, lalu pilih QRIS di jendela pembayaran.",
    requiresProof: false,
    requiresMidtrans: true,
  },
  DIRECT: {
    label: "Bayar di Tempat",
    description: "Bayar tunai atau kartu langsung ke admin saat check-in di arena.",
    requiresProof: false,
    requiresMidtrans: false,
  },
};

export const PAYMENT_INSTRUCTIONS: Record<PaymentMethod, string> = {
  DIRECT: PAYMENT_METHOD_META.DIRECT.description,
  BANK_TRANSFER: PAYMENT_METHOD_META.BANK_TRANSFER.description,
  QRIS: PAYMENT_METHOD_META.QRIS.description,
};

export const BANK_TRANSFER_DETAILS = {
  bank: "BCA",
  accountNumber: "1234567890",
  accountName: "OMAH GUYUB",
} as const;

export const MAX_FILE_SIZE = 2 * 1024 * 1024;
export const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export function isPaymentMethod(value: string): value is PaymentMethod {
  return (PAYMENT_METHODS as readonly string[]).includes(value);
}

export function getPaymentMethodLabel(method: string | null | undefined): string {
  if (!method) return "—";
  return isPaymentMethod(method) ? PAYMENT_METHOD_LABELS[method] : method;
}
