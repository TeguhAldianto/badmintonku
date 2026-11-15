import { describe, test, expect, afterAll } from "vitest";
import { buildSignature, verifySignature } from "@/features/payment/server/midtrans.gateway";

const ORIGINAL_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY;

function restoreServerKey() {
  if (ORIGINAL_SERVER_KEY === undefined) delete process.env.MIDTRANS_SERVER_KEY;
  else process.env.MIDTRANS_SERVER_KEY = ORIGINAL_SERVER_KEY;
}

const basePayload = {
  order_id: "order-1",
  status_code: "200",
  gross_amount: "50000.00",
  transaction_status: "settlement",
  transaction_id: "tr-1",
  payment_type: "qris",
  currency: "IDR",
};

describe("Midtrans webhook signature", () => {
  afterAll(restoreServerKey);

  test("buildSignature follows SHA512(order_id + status_code + gross_amount + serverKey)", () => {
    const signature = buildSignature("order-1", "200", "50000.00", "server-key");
    expect(signature).toHaveLength(128);
    expect(signature).toMatch(/^[0-9a-f]{128}$/);
  });

  test("verifySignature accepts a correctly signed payload", () => {
    process.env.MIDTRANS_SERVER_KEY = "server-key";
    const signature = buildSignature("order-1", "200", "50000.00", "server-key");

    expect(verifySignature({ ...basePayload, signature_key: signature })).toBe(true);
  });

  test("verifySignature rejects a tampered order id", () => {
    process.env.MIDTRANS_SERVER_KEY = "server-key";
    const signature = buildSignature("order-1", "200", "50000.00", "server-key");

    expect(verifySignature({ ...basePayload, order_id: "order-2", signature_key: signature })).toBe(
      false
    );
  });

  test("verifySignature rejects a tampered amount", () => {
    process.env.MIDTRANS_SERVER_KEY = "server-key";
    const signature = buildSignature("order-1", "200", "50000.00", "server-key");

    expect(
      verifySignature({ ...basePayload, gross_amount: "1.00", signature_key: signature })
    ).toBe(false);
  });

  test("verifySignature rejects missing signature or missing server key", () => {
    process.env.MIDTRANS_SERVER_KEY = "server-key";
    expect(verifySignature(basePayload)).toBe(false);

    delete process.env.MIDTRANS_SERVER_KEY;
    const signature = buildSignature("order-1", "200", "50000.00", "server-key");
    expect(verifySignature({ ...basePayload, signature_key: signature })).toBe(false);

    restoreServerKey();
  });
});
