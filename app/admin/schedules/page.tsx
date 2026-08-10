"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { formatDateInput, generateTimeSlots, formatTimeSlot, SlotStatus } from "@/lib/booking";

interface Court {
  id: number;
  name: string;
}

interface BlockedSlot {
  id: number;
  courtId: number;
  date: string;
  startTime: number;
  endTime: number;
  reason: string | null;
}

export default function AdminSchedulesPage() {
  const [courts, setCourts] = useState<Court[]>([]);
  const [selectedCourt, setSelectedCourt] = useState<string>("1");
  const [date, setDate] = useState<string>(formatDateInput(new Date()));
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [loading, setLoading] = useState(true);

  // Form for blocking slot
  const [startTime, setStartTime] = useState<number>(8);
  const [endTime, setEndTime] = useState<number>(9);
  const [reason, setReason] = useState("Maintenance");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const courtsRes = await fetch("/api/courts");
      const courtsData = await courtsRes.json();
      setCourts(courtsData.data || []);

      const res = await fetch(`/api/admin/blocked-slots?courtId=${selectedCourt}&date=${date}`);
      const data = await res.json();
      setBlockedSlots(data.data || []);
    } catch {
      toast.error("Gagal memuat data jadwal");
    } finally {
      setLoading(false);
    }
  }, [selectedCourt, date]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  const handleBlockSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/blocked-slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courtId: parseInt(selectedCourt, 10),
          date,
          startTime,
          endTime,
          reason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Jadwal berhasil diblokir");
        fetchData();
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error("Gagal memblokir jadwal");
    }
  };

  const handleUnblockSlot = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/blocked-slots?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Blokir jadwal dilepas");
        fetchData();
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error("Gagal melepas blokir");
    }
  };

  const operatingSlots = generateTimeSlots();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-text">Pengaturan Jadwal & Blokir Lapangan</h1>

      <div className="grid md:grid-cols-2 gap-8">
        <Card className="card-custom">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4">Blokir Slot Waktu</h2>
            <form onSubmit={handleBlockSlot} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lapangan</label>
                <Select value={selectedCourt} onValueChange={setSelectedCourt}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Lapangan" />
                  </SelectTrigger>
                  <SelectContent>
                    {courts.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jam Mulai</label>
                  <Select value={startTime.toString()} onValueChange={(v) => setStartTime(parseInt(v, 10))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Mulai" />
                    </SelectTrigger>
                    <SelectContent>
                      {operatingSlots.map((s) => (
                        <SelectItem key={s.startTime} value={s.startTime.toString()}>{s.startTime}:00</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jam Selesai</label>
                  <Select value={endTime.toString()} onValueChange={(v) => setEndTime(parseInt(v, 10))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selesai" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 14 - startTime }, (_, i) => startTime + 1 + i).map((h) => (
                        <SelectItem key={h} value={h.toString()}>{h}:00</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alasan Blokir</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  required
                />
              </div>

              <Button type="submit" className="w-full btn-primary">Blokir Slot</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="card-custom">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4">Daftar Slot Diblokir</h2>
            {loading ? (
              <div className="text-center py-8">Memuat...</div>
            ) : blockedSlots.length === 0 ? (
              <div className="text-center py-8 text-gray-500">Tidak ada slot yang diblokir pada tanggal ini</div>
            ) : (
              <div className="space-y-3">
                {blockedSlots.map((bs) => (
                  <div key={bs.id} className="flex items-center justify-between p-4 bg-gray-50 border rounded-lg">
                    <div>
                      <p className="font-semibold text-text">
                        {formatTimeSlot({ startTime: bs.startTime, endTime: bs.endTime, status: "BLOCKED" })}
                      </p>
                      <p className="text-sm text-gray-600">Alasan: {bs.reason || "Maintenance"}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUnblockSlot(bs.id)}
                      className="text-red-600 border-red-600 hover:bg-red-50"
                    >
                      Buka Blokir
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}