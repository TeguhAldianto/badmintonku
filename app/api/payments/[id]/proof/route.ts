import { isPaymentMethod, uploadPaymentProof } from "@/features/payment/server/payment.service";
import { fail, handleRouteError, ok } from "@/shared/api/response";

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const formData = await request.formData();
    const file = formData.get("file");
    const method = formData.get("method");
    const userPhone = formData.get("userPhone");

    if (!(file instanceof File) || typeof method !== "string" || typeof userPhone !== "string") {
      return fail("File, metode pembayaran, dan nomor HP wajib diisi", 400);
    }
    if (!isPaymentMethod(method)) {
      return fail("Metode pembayaran tidak valid", 400);
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return fail("Ukuran file maksimal 2MB", 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const payment = await uploadPaymentProof({
      bookingId: id,
      userPhone,
      file: buffer,
      mimeType: file.type,
      method,
    });

    return ok(payment);
  } catch (error) {
    return handleRouteError(error, "Gagal upload bukti pembayaran");
  }
}
