import { z } from "zod";

export const createBookingSchema = z.object({
  courtId: z.coerce.number().int().positive("Lapangan tidak valid"),
  date: z.string().min(1, "Tanggal wajib diisi"),
  startTime: z.coerce.number().int().min(0).max(24),
  endTime: z.coerce.number().int().min(0).max(24),
  userName: z.string().trim().min(3, "Nama pemesan minimal 3 karakter").max(100),
  userPhone: z.string().min(1, "Nomor HP wajib diisi"),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const availabilityQuerySchema = z.object({
  courtId: z.coerce.number().int().positive("courtId tidak valid"),
  date: z.string().min(1, "date wajib diisi"),
});
