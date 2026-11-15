import crypto from "node:crypto";
import Snap from "midtrans-client";
import { AppError } from "@/shared/api/errors";

export interface MidtransNotificationPayload {
  transaction_status: string;
  transaction_id: string;
  order_id: string;
  gross_amount: string;
  payment_type: string;
  fraud_status?: string;
  status_code: string;
  currency: string;
  signature_key?: string;
}

export interface MidtransBookingInput {
  id: string;
  totalPrice: number;
  userName: string;
  userPhone: string;
}

/** Shape of `GET /v2/{order_id}/status` (the trustworthy server-side status source). */
export interface MidtransStatusResponse {
  order_id: string;
  transaction_id?: string;
  transaction_status: string;
  gross_amount: string;
  payment_type?: string;
  fraud_status?: string;
  status_code?: string;
  currency?: string;
  settlement_time?: string;
}

function getServerKey(): string {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) {
    throw new AppError("Midtrans belum dikonfigurasi (MIDTRANS_SERVER_KEY kosong)", 500);
  }
  return serverKey;
}

export function isMidtransConfigured(): boolean {
  return Boolean(process.env.MIDTRANS_SERVER_KEY && process.env.MIDTRANS_CLIENT_KEY);
}

/**
 * Midtrans signature_key = SHA512(order_id + status_code + gross_amount + serverKey).
 * This is the only trustworthy way to know a webhook really came from Midtrans.
 */
export function buildSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  serverKey: string
): string {
  return crypto.createHash("sha512").update(`${orderId}${statusCode}${grossAmount}${serverKey}`).digest("hex");
}

/** Verifies the webhook signature. Returns false when the key is missing or the digest differs. */
export function verifySignature(notification: MidtransNotificationPayload): boolean {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey || !notification.signature_key) return false;

  const expected = buildSignature(
    notification.order_id,
    notification.status_code,
    notification.gross_amount,
    serverKey
  );

  const received = notification.signature_key.toLowerCase();
  if (received.length !== expected.length) return false;

  return crypto.timingSafeEqual(Buffer.from(received, "utf8"), Buffer.from(expected, "utf8"));
}

let snapClient: Snap | null = null;
let snapClientKey: string | null = null;

function getSnapClient(): Snap {
  const serverKey = getServerKey();
  // Rebuild when the key changes (e.g. tests or a key rotation) instead of leaking a stale client.
  if (snapClient && snapClientKey === serverKey) return snapClient;

  const SnapConstructor = (Snap as unknown as { Snap?: new (config: Record<string, unknown>) => Snap }).Snap ?? Snap;

  snapClient = new SnapConstructor({
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
    serverKey,
    clientKey: process.env.MIDTRANS_CLIENT_KEY || "",
  });
  snapClientKey = serverKey;

  return snapClient;
}

export async function createSnapToken(booking: MidtransBookingInput): Promise<string> {
  return getSnapClient().createTransactionToken({
    transaction_details: {
      order_id: booking.id,
      gross_amount: Math.round(booking.totalPrice),
    },
    customer_details: {
      first_name: booking.userName,
      phone: booking.userPhone,
    },
    credit_card: { secure: true },
  });
}

export function getSnapRedirectUrl(token: string): string {
  const base =
    process.env.MIDTRANS_IS_PRODUCTION === "true"
      ? "https://app.midtrans.com/snap/v3/redirection"
      : "https://app.sandbox.midtrans.com/snap/v3/redirection";
  return `${base}/${token}`;
}

/**
 * Server-side status lookup. Used when the webhook cannot reach a local/staging host
 * (Midtrans only calls public notification URLs), so a demo can still settle payments.
 */
export async function getTransactionStatus(orderId: string): Promise<MidtransStatusResponse> {
  return (await getSnapClient().transaction.status(orderId)) as unknown as MidtransStatusResponse;
}
