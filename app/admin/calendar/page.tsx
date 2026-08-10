"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { generateTimeSlots, SlotStatus } from "@/lib/booking";
import { formatDateInput } from "@/lib/booking";

interface Court {
  id: number;
  name: string;
}

interface Slot {
  startTime: number;
  endTime: number;
  status: SlotStatus;
}

export default function AdminCalendarPage() {
  const [date, setDate] = useState<string>(formatDateInput(new Date()));
  const [courts, setCourts] = useState<Court[]>([]);
  const [availability, setAvailability] = useState<Record<number, Slot[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCourtsAndSlots() {
      setLoading(true);
      const courtsRes = await fetch("/api/courts");
      const courtsData = await courtsRes.json();
      const courtsList = courtsData.data || [];
      setCourts(courtsList);

      const availMap: Record<number, Slot[]> = {};
      for (const court of courtsList) {
        const res = await fetch(`/api/availability?courtId=${court.id}&date=${date}`);
        const data = await res.json();
        availMap[court.id] = data.data || [];
      }
      setAvailability(availMap);
      setLoading(false);
    }
    fetchCourtsAndSlots();
  }, [date]);

  const slots = generateTimeSlots();

  const getStatusBadge = (status: SlotStatus) => {
    switch (status) {
      case "AVAILABLE":
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">AVAILABLE</span>;
      case "BOOKED":
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">BOOKED</span>;
      case "PENDING":
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">PENDING</span>;
      case "BLOCKED":
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-medium">BLOCKED</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-medium">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-text">Kalender & Jadwal Lapangan</h1>
        <div className="flex items-center gap-2">
          <label htmlFor="calendar-date-input" className="text-sm font-medium text-gray-700">Tanggal:</label>
          <input
            id="calendar-date-input"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm bg-white"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20">Memuat jadwal...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {courts.map((court) => {
            const courtSlots = availability[court.id] || slots;
            return (
              <Card key={court.id} className="card-custom">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-text mb-4 pb-2 border-b">{court.name}</h3>
                  <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                    {courtSlots.map((slot) => (
                      <div
                        key={slot.startTime}
                        className="flex items-center justify-between p-3 rounded-lg border bg-gray-50/50"
                      >
                        <span className="font-medium text-sm">
                          {slot.startTime}:00 – {slot.endTime}:00
                        </span>
                        {getStatusBadge(slot.status)}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}