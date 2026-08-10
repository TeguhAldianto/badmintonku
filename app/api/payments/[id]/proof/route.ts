import { NextResponse } from "next/server";
import { uploadPaymentProof, PAYMENT_METHODS, PaymentMethod } from "@/services/payment.service";
import { auth } from "@/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const method = formData.get("method") as string;
    const userPhone = formData.get("userPhone") as string;

    if (!file || !method || !userPhone) {
      return NextResponse.json(
        { success: false, message: "File, metode pembayaran, dan nomor HP wajib diisi" },
        { status: 400 }
      );
    }

    const validMethod = PAYMENT_METHODS.includes(method as PaymentMethod) ? method as PaymentMethod : null;
    if (!validMethod) {
      return NextResponse.json(
        { success: false, message: "Metode pembayaran tidak valid" },
        { status: 400 }
      );
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: "Format file tidak didukung (JPG, PNG, WebP)" },
        { status: 400 }
      );
    }
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, message: "Ukuran file maksimal 2MB" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const payment = await uploadPaymentProof({
      bookingId: id,
      userPhone,
      file: buffer,
      mimeType: file.type,
      method: validMethod,
    });

    return NextResponse.json({ success: true, data: payment });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal upload bukti pembayaran";
    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}