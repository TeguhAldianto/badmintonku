import BookingWorkspace from "@/features/booking/components/BookingWorkspace";

export default async function BookingPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;

  return <BookingWorkspace initialDate={date} />;
}
