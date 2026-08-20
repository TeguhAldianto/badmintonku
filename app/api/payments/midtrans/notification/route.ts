import { NextResponse } from "next/server";
import { handleMidtransNotification } from "@/services/midtrans.notification";

export async function POST(request: Request) {
  try {
    const notification = await request.json();
    
    console.log("Received Midtrans notification:", JSON.stringify(notification, null, 2));

    const result = await handleMidtransNotification(notification);

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Error handling Midtrans notification:", error);
    const message = error instanceof Error ? error.message : "Gagal memproses notifikasi";
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}