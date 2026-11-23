import { z } from "zod";

import {
  getBookingsByUser,
  normalizePhone,
  toGuestBookingSummary,
} from "@/features/booking/server/booking.service";
import { verifyLookupOtp } from "@/features/booking/server/lookup-otp";
import { fail, handleRouteError, ok, readJson } from "@/shared/api/response";

const verifySchema = z.object({
  phone: z.string().trim().min(8, "Nomor WhatsApp wajib diisi"),
  code: z.string().trim().regex(/^\d{6}$/, "Kode verifikasi harus 6 digit"),
});

export async function POST(request: Request) {
  try {
    const parsed = verifySchema.safeParse(await readJson<unknown>(request));
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Data tidak valid", 400);
    }

    const phone = normalizePhone(parsed.data.phone);
    if (!(await verifyLookupOtp(phone, parsed.data.code))) {
      return fail("Kode verifikasi salah atau sudah kedaluwarsa", 400);
    }

    const bookings = await getBookingsByUser(phone);
    return ok(bookings.map(toGuestBookingSummary));
  } catch (error) {
    return handleRouteError(error, "Gagal memverifikasi kode");
  }
}
