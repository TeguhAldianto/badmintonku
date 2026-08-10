import { NextResponse } from "next/server";
import { processPaymentAdmin } from "@/services/payment.service";
import { auth } from "@/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Forbidden: Admin only" }, { status: 403 });
    }

    const body = await request.json();
    const { action, rejectionReason } = body;

    if (!action || !["APPROVE", "REJECT"].includes(action)) {
      return NextResponse.json(
        { success: false, message: "Action harus APPROVE atau REJECT" },
        { status: 400 }
      );
    }

    if (action === "REJECT" && !rejectionReason) {
      return NextResponse.json(
        { success: false, message: "Alasan penolakan wajib diisi" },
        { status: 400 }
      );
    }

    const adminId = session.user.id ?? "admin-unknown";
    
    const payment = await processPaymentAdmin({
      paymentId: id,
      action,
      adminId,
      rejectionReason,
    });

    return NextResponse.json({ success: true, data: payment });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal memproses pembayaran";
    const status = message.includes("Forbidden") ? 403 : 400;
    return NextResponse.json({ success: false, message }, { status });
  }
}