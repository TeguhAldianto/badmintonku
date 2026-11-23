import type { Metadata } from "next";

import BookingWorkspace from "@/features/booking/components/BookingWorkspace";

export const metadata: Metadata = {
  title: "Reservasi Lapangan",
  description: "Pilih tanggal, lapangan, dan jam main di OMAH GUYUB.",
};

export default async function BookingPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;

  return <BookingWorkspace initialDate={date} />;
}
