import { NextResponse } from "next/server";
import { handleMidtransNotification } from "@/features/payment/server/midtrans.webhook";
import type { MidtransNotificationPayload } from "@/features/payment/server/midtrans.gateway";
import { handleRouteError, readJson } from "@/shared/api/response";
export async function POST(request: Request) {
  try {
    const payload = await readJson<MidtransNotificationPayload>(request);

    console.log("Received Midtrans notification:", {
      order_id: payload.order_id,
      transaction_status: payload.transaction_status,
      status_code: payload.status_code,
    });

    const result = await handleMidtransNotification(payload);

    if (!result.success) {
      const status =
        result.message === "Invalid signature"
          ? 401
          : result.message === "Payment not found"
            ? 404
            : 400;
      return NextResponse.json(result, { status });
    }

    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error, "Gagal memproses notifikasi");
  }
}
