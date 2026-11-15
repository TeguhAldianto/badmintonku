import { z } from "zod";
import { requireAdmin } from "@/server/auth/guards";
import { processPaymentAdmin } from "@/features/payment/server/payment.service";
import { fail, handleRouteError, ok, readJson } from "@/shared/api/response";

const actionSchema = z
  .object({
    action: z.enum(["APPROVE", "REJECT"]),
    rejectionReason: z.string().trim().max(500).optional(),
  })
  .refine((value) => value.action !== "REJECT" || Boolean(value.rejectionReason), {
    message: "Alasan penolakan wajib diisi",
    path: ["rejectionReason"],
  });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdmin();
    const { id } = await params;

    const body = await readJson<unknown>(request);
    const parsed = actionSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Data tidak valid", 400);
    }

    const result = await processPaymentAdmin({
      paymentId: id,
      action: parsed.data.action,
      adminId: session.user?.id ?? session.user?.email ?? "admin-unknown",
      rejectionReason: parsed.data.rejectionReason,
    });

    return ok(result);
  } catch (error) {
    return handleRouteError(error, "Gagal memproses pembayaran");
  }
}
