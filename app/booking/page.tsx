"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { HorizontalDateSelector } from "@/components/ui/horizontal-date-selector";
import { CourtAvailabilityGrid } from "@/components/ui/availability-grid";
import { StickyBookingCTA } from "@/components/ui/sticky-booking-cta";
import { startOfDay } from "date-fns";

function BookingContent() {
  const router = useRouter();
  
  const [date, setDate] = useState<Date>(startOfDay(new Date()));
  const [courts, setCourts] = useState<Array<{ id: number; name: string }>>([]);
  const [slots, setSlots] = useState<Record<number, Array<{ startTime: number; endTime: number; status: "AVAILABLE" | "BOOKED" | "BLOCKED" }>>>({});
  const [selectedSlots, setSelectedSlots] = useState<Record<number, number[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const courtsRes = await fetch("/api/courts");
      const courtsData = await courtsRes.json();
      setCourts(courtsData.data || []);
      setLoading(false);
    }
    fetchData();
  }, []);

  useEffect(() => {
    async function fetchAllSlots() {
      setLoading(true);
      const dateStr = date.toISOString().split("T")[0];
      const newSlots: Record<number, Array<{ startTime: number; endTime: number; status: "AVAILABLE" | "BOOKED" | "BLOCKED" }>> = {};
      
      for (const court of courts) {
        const res = await fetch(`/api/availability?courtId=${court.id}&date=${dateStr}`);
        const data = await res.json() as { data?: Array<{ startTime: number; endTime: number; status: "AVAILABLE" | "BOOKED" | "BLOCKED" }> };
        newSlots[court.id] = data.data || [];
      }
      setSlots(newSlots);
      setLoading(false);
    }
    if (courts.length > 0) fetchAllSlots();
  }, [date, courts]);

  const toggleSlot = (courtId: number, startTime: number) => {
    const current = selectedSlots[courtId] || [];
    if (current.includes(startTime)) {
      setSelectedSlots({ ...selectedSlots, [courtId]: current.filter(s => s !== startTime) });
    } else {
      setSelectedSlots({ ...selectedSlots, [courtId]: [...current, startTime].sort() });
    }
  };

  const calculateTotal = () => {
    let total = 0;
    Object.values(selectedSlots).forEach(slots => total += slots.length * 50000);
    return total;
  };

  const handleBooking = async () => {
    const bookingPromises = Object.entries(selectedSlots).map(async ([courtId, slots]) => {
      if (slots.length === 0) return null;
      const startTime = Math.min(...slots);
      const endTime = Math.max(...slots) + 1;
      
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courtId: parseInt(courtId),
          date: date.toISOString().split("T")[0],
          startTime,
          endTime,
          userName: "User Guest",
          userPhone: "08123456789",
        }),
      });
      return res.json();
    });

    const results = await Promise.all(bookingPromises);
    if (results.every(r => r?.success)) {
      toast.success("Booking berhasil!");
      router.push(`/bookings/${results[0].data.id}`);
    } else {
      toast.error("Gagal memproses salah satu booking");
    }
  };

  if (loading) return <div className="container-app py-10 text-center">Loading...</div>;

  const totalSlots = Object.values(selectedSlots).reduce((acc, curr) => acc + curr.length, 0);

  return (
    <div className="container-app py-8 space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-text">Pilih Waktu Main</h1>
        <HorizontalDateSelector selectedDate={date} onSelectDate={setDate} />
      </div>

      <div className="space-y-8 pb-20">
        {(courts || []).map(court => (
          <CourtAvailabilityGrid
            key={court.id}
            courtId={court.id}
            courtName={court.name}
            slots={slots[court.id] || []}
            selectedSlots={selectedSlots[court.id] || []}
            onSlotClick={(start) => toggleSlot(court.id, start)}
          />
        ))}
      </div>

      <StickyBookingCTA
        selectedCount={totalSlots}
        totalPrice={calculateTotal()}
        onClick={handleBooking}
      />
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={<div className="container-app py-10 text-center">Loading...</div>}>
      <BookingContent />
    </Suspense>
  );
}