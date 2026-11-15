import SnapImport from "midtrans-client";
type SnapInstance = InstanceType<typeof SnapImport>;

const serverKey = process.env.MIDTRANS_SERVER_KEY!;
const clientKey = process.env.MIDTRANS_CLIENT_KEY!;

const SnapCtor =
  (SnapImport as unknown as { Snap?: new (config: Record<string, unknown>) => SnapInstance }).Snap ??
  (SnapImport as unknown as new (config: Record<string, unknown>) => SnapInstance);

const snap = new SnapCtor({ isProduction: false, serverKey, clientKey }) as unknown as {
  createTransaction: (params: Record<string, unknown>) => Promise<Record<string, unknown>>;
};

async function rawStatus(orderId: string, headers: Record<string, string>) {
  const res = await fetch(`https://api.sandbox.midtrans.com/v2/${orderId}/status`, {
    headers,
    signal: AbortSignal.timeout(15000),
  });
  const body = (await res.json()) as Record<string, unknown>;
  return { http: res.status, body };
}

async function main() {
  const orderId = `smoke-${Date.now()}`;
  const raw: Record<string, unknown> = await snap.createTransaction({
    transaction_details: { order_id: orderId, gross_amount: 50000 },
    customer_details: { first_name: "Smoke Test", phone: "08123456789" },
    credit_card: { secure: true },
  } as never);
  console.log("created token:", raw.token);

  const auth = { Accept: "application/json", Authorization: "Basic " + Buffer.from(serverKey + ":").toString("base64") };

  for (const headers of [
    auth,
    { ...auth, "transaction-source": "SNAP_API" },
    { ...auth, "transaction-source": "CORE_API" },
  ]) {
    try {
      const result = await rawStatus(orderId, headers);
      console.log("headers:", JSON.stringify(headers), "=>", result.http, JSON.stringify(result.body));
    } catch (error) {
      console.log("headers:", JSON.stringify(headers), "=> ERROR", (error as Error).message);
    }
  }
}

main()
  .catch((error) => {
    console.error("FAILED:", error);
    process.exitCode = 1;
  })
  .finally(() => process.exit(process.exitCode ?? 0));
