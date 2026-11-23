import { z } from "zod";

import {
  getBookingsByUser,
  normalizePhone,
} from "@/features/booking/server/booking.service";
import { createLookupOtp } from "@/features/booking/server/lookup-otp";
import { sendWhatsAppNotification } from "@/features/notification/server/notification.service";
import { NOTIFICATION_TEMPLATES } from "@/features/notification/server/templates";
import { fail, handleRouteError, ok, readJson } from "@/shared/api/response";

const PHONE_RE = /^08\d{8,11}$/;
const OTP_MINUTES = 5;

const lookupSchema = z.object({
  phone: z.string().trim().min(8, "Nomor WhatsApp wajib diisi"),
});

/**
 * Sends a one-time code to the WhatsApp number. The response is identical whether
 * or not the number has bookings, so this cannot be used to enumerate customers.
 */
export async function POST(request: Request) {
  try {
    if (!process.env.WHATSAPP_API_KEY && !process.env.FONNTE_API_KEY) {
      return fail("Layanan WhatsApp belum dikonfigurasi. Hubungi admin.", 503);
    }

    const parsed = lookupSchema.safeParse(await readJson<unknown>(request));
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Nomor WhatsApp tidak valid", 400);
    }

    const phone = normalizePhone(parsed.data.phone);
    if (!PHONE_RE.test(phone)) {
      return fail("Nomor WhatsApp tidak valid. Gunakan format 08xxxxxxxxxx.", 400);
    }

    const bookings = await getBookingsByUser(phone);
    if (bookings.length > 0) {
      const code = await createLookupOtp(phone);
      if (code) {
        const result = await sendWhatsAppNotification({
          target: phone,
          message: NOTIFICATION_TEMPLATES.LOOKUP_OTP({ code, minutes: OTP_MINUTES }),
          type: "LOOKUP_OTP",
          referenceId: phone,
        });
        if (!result.success) console.error("Failed to send lookup OTP:", result.error);
      }
    }

    return ok({ message: "Jika nomor terdaftar, kode verifikasi telah dikirim ke WhatsApp." });
  } catch (error) {
    return handleRouteError(error, "Gagal mengirim kode verifikasi");
  }
}
