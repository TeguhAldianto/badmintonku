"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { DEFAULT_OPERATING_HOURS, generateTimeSlots } from "@/features/booking/lib/slots";
import type { OperatingHours } from "@/features/booking/types";
import { toCalendarDateString } from "@/shared/lib/date";
import { formatTimeSlot } from "@/shared/lib/format";

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

const FIELD_CLASS =
  "w-full rounded-[2px] border border-navy/30 bg-chalk px-3 py-2 text-sm text-navy outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt transition-colors focus:border-navy";

const LABEL_CLASS =
  "mb-1 block font-mono text-[11px] font-bold uppercase tracking-wider text-navy";

export default function AdminSchedulesPage() {
  const [courts, setCourts] = useState<Court[]>([]);
  const [selectedCourt, setSelectedCourt] = useState<string>("1");
  const [date, setDate] = useState<string>(toCalendarDateString(new Date()));
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hours, setHours] = useState<OperatingHours>(DEFAULT_OPERATING_HOURS);
  const [submittingBlock, setSubmittingBlock] = useState(false);
  const [unblockingId, setUnblockingId] = useState<number | null>(null);

  const [startTime, setStartTime] = useState<number>(DEFAULT_OPERATING_HOURS.open);
  const [endTime, setEndTime] = useState<number>(DEFAULT_OPERATING_HOURS.open + 1);
  const [reason, setReason] = useState("Maintenance");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const courtsRes = await fetch("/api/courts", { cache: "no-store" });
      const courtsData = await courtsRes.json();
      setCourts((courtsData.data ?? []) as Court[]);

      const [availabilityRes, blockedRes] = await Promise.all([
        fetch(`/api/availability?courtId=${selectedCourt}&date=${date}`, { cache: "no-store" }),
        fetch(`/api/admin/blocked-slots?courtId=${selectedCourt}&date=${date}`, {
          cache: "no-store",
        }),
      ]);

      if (!blockedRes.ok) throw new Error("Gagal memuat slot yang diblokir");

      const availabilityData = await availabilityRes.json();
      const operatingHours = availabilityData.data?.operatingHours as OperatingHours | undefined;
      if (operatingHours) setHours(operatingHours);

      const blockedData = await blockedRes.json();
      setBlockedSlots((blockedData.data ?? []) as BlockedSlot[]);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Gagal memuat data jadwal");
    } finally {
      setLoading(false);
    }
  }, [selectedCourt, date]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  const startOptions = useMemo(
    () => generateTimeSlots(hours).map((slot) => slot.startTime),
    [hours]
  );

  const endOptions = useMemo(() => {
    const options: number[] = [];
    for (let hour = Math.max(startTime + 1, hours.open + 1); hour <= hours.close; hour++) {
      options.push(hour);
    }
    return options;
  }, [startTime, hours]);

  useEffect(() => {
    if (endTime <= startTime) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEndTime(Math.min(startTime + 1, hours.close));
    }
  }, [startTime, endTime, hours.close]);

  const handleBlockSlot = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmittingBlock(true);
    try {
      const res = await fetch("/api/admin/blocked-slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courtId: Number.parseInt(selectedCourt, 10),
          date,
          startTime,
          endTime,
          reason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Jadwal berhasil diblokir");
        await fetchData();
      } else {
        toast.error(data.message ?? "Gagal memblokir jadwal");
      }
    } catch {
      toast.error("Gagal memblokir jadwal");
    } finally {
      setSubmittingBlock(false);
    }
  };

  const handleUnblockSlot = async (id: number) => {
    setUnblockingId(id);
    try {
      const res = await fetch(`/api/admin/blocked-slots?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("Blokir jadwal dilepas");
        await fetchData();
      } else {
        toast.error(data.message ?? "Gagal melepas blokir");
      }
    } catch {
      toast.error("Gagal melepas blokir");
    } finally {
      setUnblockingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-navy pb-3">
        <div>
          <span className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-terracotta">
            Modul 06
          </span>
          <h1 className="mt-1 font-display text-xl font-bold tracking-tight sm:text-2xl">
            Jadwal &amp; Blokir Lapangan
          </h1>
        </div>
        <span className="font-mono text-[11px] uppercase tracking-wider text-slate-muted">
          Jam operasional {String(hours.open).padStart(2, "0")}:00–
          {String(hours.close).padStart(2, "0")}:00 WIB
        </span>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="border border-navy bg-paper">
          <header className="border-b border-navy bg-birch px-4 py-2.5">
            <h2 className="font-mono text-[11px] font-bold uppercase tracking-wider text-navy">
              Blokir slot waktu
            </h2>
          </header>

          <form onSubmit={handleBlockSlot} className="space-y-3 p-4">
            <div>
              <label htmlFor="block-court" className={LABEL_CLASS}>
                Lapangan
              </label>
              <Select value={selectedCourt} onValueChange={setSelectedCourt}>
                <SelectTrigger id="block-court">
                  <SelectValue placeholder="Pilih Lapangan" />
                </SelectTrigger>
                <SelectContent>
                  {courts.map((court) => (
                    <SelectItem key={court.id} value={court.id.toString()}>
                      {court.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label htmlFor="schedule-date" className={LABEL_CLASS}>
                Tanggal
              </label>
              <input
                id="schedule-date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className={FIELD_CLASS}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="block-start" className={LABEL_CLASS}>
                  Jam mulai
                </label>
                <Select
                  value={startTime.toString()}
                  onValueChange={(value) => setStartTime(Number.parseInt(value, 10))}
                >
                  <SelectTrigger id="block-start">
                    <SelectValue placeholder="Mulai" />
                  </SelectTrigger>
                  <SelectContent>
                    {startOptions.map((hour) => (
                      <SelectItem key={hour} value={hour.toString()}>
                        {String(hour).padStart(2, "0")}:00
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label htmlFor="block-end" className={LABEL_CLASS}>
                  Jam selesai
                </label>
                <Select
                  value={endTime.toString()}
                  onValueChange={(value) => setEndTime(Number.parseInt(value, 10))}
                >
                  <SelectTrigger id="block-end">
                    <SelectValue placeholder="Selesai" />
                  </SelectTrigger>
                  <SelectContent>
                    {endOptions.map((hour) => (
                      <SelectItem key={hour} value={hour.toString()}>
                        {String(hour).padStart(2, "0")}:00
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label htmlFor="block-reason" className={LABEL_CLASS}>
                Alasan blokir
              </label>
              <input
                id="block-reason"
                type="text"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className={FIELD_CLASS}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={submittingBlock}>
              {submittingBlock ? "Memblokir…" : "Blokir slot"}
            </Button>
          </form>
        </section>

        <section className="border border-navy bg-paper">
          <header className="flex items-center justify-between border-b border-navy bg-birch px-4 py-2.5">
            <h2 className="font-mono text-[11px] font-bold uppercase tracking-wider text-navy">
              Slot diblokir
            </h2>
            <span className="font-mono text-[11px] font-bold tabular-nums text-terracotta">
              {blockedSlots.length} entri
            </span>
          </header>

          {loading ? (
            <p className="px-4 py-10 text-center font-mono text-[11px] uppercase tracking-wider text-slate-muted">
              Memuat slot…
            </p>
          ) : error ? (
            <div className="space-y-3 px-4 py-10 text-center">
              <p className="font-mono text-[11px] uppercase tracking-wider text-terracotta">
                Gagal memuat slot
              </p>
              <p className="text-xs text-slate-muted">{error}</p>
              <Button variant="navy" onClick={() => void fetchData()}>
                Coba lagi
              </Button>
            </div>
          ) : blockedSlots.length === 0 ? (
            <p className="px-4 py-10 text-center font-mono text-[11px] uppercase tracking-wider text-slate-muted">
              Tidak ada slot diblokir pada tanggal ini
            </p>
          ) : (
            <ul className="divide-y divide-navy/15">
              {blockedSlots.map((blocked) => (
                <li
                  key={blocked.id}
                  className="flex items-center justify-between gap-3 px-4 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-bold tabular-nums text-navy">
                      {formatTimeSlot({ startTime: blocked.startTime, endTime: blocked.endTime })}
                    </p>
                    <p className="mt-0.5 truncate font-mono text-[11px] uppercase tracking-wide text-slate-muted">
                      {blocked.reason || "Maintenance"}
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleUnblockSlot(blocked.id)}
                    disabled={unblockingId === blocked.id}
                  >
                    {unblockingId === blocked.id ? "Memproses…" : "Buka blokir"}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
