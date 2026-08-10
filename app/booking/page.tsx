"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatTimeSlot, SlotStatus } from "@/lib/booking";

function BookingContent() {
  const searchParams = useSearchParams();
  const date = searchParams.get("date");
  const router = useRouter();
  
  const [courts, setCourts] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedCourt, setSelectedCourt] = useState<number | null>(null);
  const [slots, setSlots] = useState<Array<{ startTime: number; endTime: number; status: SlotStatus }>>([]);
  const [selectedSlots, setSelectedSlots] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const courtsRes = await fetch("/api/courts");
      const courtsData = await courtsRes.json();
      setCourts(courtsData.data);
      setLoading(false);
    }
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedCourt && date) {
      async function fetchSlots() {
        setLoading(true);
        const res = await fetch(`/api/availability?courtId=${selectedCourt}&date=${date}`);
        const data = await res.json();
        setSlots(data.data);
        setSelectedSlots([]);
        setLoading(false);
      }
      fetchSlots();
    }
  }, [selectedCourt, date]);

  const toggleSlot = (startTime: number) => {
    if (selectedSlots.includes(startTime)) {
      setSelectedSlots(selectedSlots.filter(s => s !== startTime));
    } else {
      setSelectedSlots([...selectedSlots, startTime].sort());
    }
  };

  const handleBooking = async () => {
    if (selectedSlots.length === 0) return;
    
    const startTime = Math.min(...selectedSlots);
    const endTime = Math.max(...selectedSlots) + 1;
    
    const bookingData = {
      courtId: selectedCourt,
      date,
      startTime,
      endTime,
      userName: "User Guest",
      userPhone: "08123456789",
      pricePerSlot: 50000,
    };

    const res = await fetch("/api/bookings", {
      method: "POST",
      body: JSON.stringify(bookingData),
    });

    const data = await res.json();
    if (data.success) {
      toast.success("Booking berhasil dibuat!");
      router.push(`/bookings/${data.data.id}`);
    } else {
      toast.error(data.message);
    }
  };

  if (loading) return <div className="container-app py-10 text-center">Loading...</div>;

  return (
    <div className="container-app py-10">
      <h1 className="text-3xl font-bold mb-8 text-center text-text">Booking Lapangan</h1>
      
      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">1. Pilih Lapangan</h2>
          <div className="grid grid-cols-1 gap-4">
            {courts.map(c => (
              <Button 
                key={c.id}
                className={`py-6 ${selectedCourt === c.id ? "btn-primary" : "bg-white text-text border-border hover:bg-gray-50"}`}
                onClick={() => setSelectedCourt(c.id)}
              >
                {c.name}
              </Button>
            ))}
          </div>
        </div>

        {selectedCourt && (
          <div>
            <h2 className="text-xl font-semibold mb-4">2. Pilih Jam</h2>
            <div className="grid grid-cols-2 gap-2">
              {slots.map((slot) => (
                <Button
                  key={slot.startTime}
                  disabled={slot.status !== "AVAILABLE"}
                  className={selectedSlots.includes(slot.startTime) ? "btn-primary" : "bg-white text-text border-border hover:bg-gray-50"}
                  onClick={() => toggleSlot(slot.startTime)}
                >
                  {formatTimeSlot(slot)}
                </Button>
              ))}
            </div>
            
            <div className="mt-8">
              <Button onClick={handleBooking} disabled={selectedSlots.length === 0} className="w-full btn-primary py-6 text-lg">
                Konfirmasi Booking
              </Button>
            </div>
          </div>
        )}
      </div>
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