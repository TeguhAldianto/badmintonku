"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/shared/components/status-badge";
import { formatCurrency, formatDateIndo, formatTimeSlot } from "@/shared/lib/format";
import { toast } from "sonner";

interface Booking {
  id: string;
  userName: string;
  userPhone: string;
  court: { name: string } | null;
  date: string;
  startTime: number;
  endTime: number;
  status: string;
  totalPrice: number;
  createdAt: string;
}

const ACTION_BUTTON =
  "rounded-[2px] border px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wider transition-colors whitespace-nowrap";

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (statusFilter !== "all") params.append("status", statusFilter);
      const res = await fetch(`/api/admin/bookings?${params.toString()}`);
      const data = await res.json();
      setBookings(data.data || []);
    } catch {
      toast.error("Gagal memuat booking");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchBookings();
  }, [fetchBookings]);

  const handleStatusChange = async (bookingId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Status diubah menjadi ${newStatus}`);
        fetchBookings();
        setSelectedBooking(null);
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error("Gagal mengubah status");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#141824] pb-3">
        <div>
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#C84B31]">
            Modul 03
          </span>
          <h1 className="mt-1 font-display text-xl font-bold tracking-tight sm:text-2xl">
            Manajemen Booking
          </h1>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-[#6E6A61]">
          {loading ? "Memuat…" : `${bookings.length} baris ditampilkan`}
        </span>
      </div>

      <div className="flex flex-col gap-2 border border-[#141824] bg-[#EAE6DD] p-3 sm:flex-row sm:items-center">
        <Input
          placeholder="Cari nama, nomor HP, atau kode booking…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="max-w-md bg-[#FAF9F6]"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Semua Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="PENDING_PAYMENT">Menunggu Pembayaran</SelectItem>
            <SelectItem value="WAITING_VERIFICATION">Menunggu Verifikasi</SelectItem>
            <SelectItem value="CONFIRMED">Dikonfirmasi</SelectItem>
            <SelectItem value="COMPLETED">Selesai</SelectItem>
            <SelectItem value="CANCELLED">Dibatalkan</SelectItem>
            <SelectItem value="REJECTED">Ditolak</SelectItem>
            <SelectItem value="EXPIRED">Kadaluarsa</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <section className="border border-[#141824] bg-[#FAF9F6]">
        {loading ? (
          <p className="px-4 py-10 text-center font-mono text-[11px] uppercase tracking-wider text-[#6E6A61]">
            Memuat data booking…
          </p>
        ) : bookings.length === 0 ? (
          <p className="px-4 py-10 text-center font-mono text-[11px] uppercase tracking-wider text-[#6E6A61]">
            Tidak ada booking yang cocok dengan filter
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#141824] bg-[#EAE6DD]">
                  {[
                    "Kode",
                    "Pemesan",
                    "Lapangan",
                    "Tanggal",
                    "Jam",
                    "Status",
                    "Harga",
                    "Aksi",
                  ].map((header) => (
                    <th
                      key={header}
                      className="whitespace-nowrap px-3 py-2 font-mono text-[9px] font-bold uppercase tracking-wider text-[#141824]"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr
                    key={booking.id}
                    className="border-b border-[#141824]/10 last:border-0 hover:bg-[#EAE6DD]/40"
                  >
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px] text-[#141824]">
                      {booking.id.slice(0, 8)}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-[#141824]">
                      <span className="block font-semibold">{booking.userName}</span>
                      <span className="font-mono text-[10px] text-[#6E6A61]">
                        {booking.userPhone}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-xs text-[#141824]">
                      {booking.court?.name || "-"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[10px] text-[#6E6A61]">
                      {formatDateIndo(new Date(booking.date))}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[10px] tabular-nums text-[#141824]">
                      {formatTimeSlot({ startTime: booking.startTime, endTime: booking.endTime })}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <StatusBadge status={booking.status} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px] font-semibold tabular-nums text-[#141824]">
                      {formatCurrency(booking.totalPrice)}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {booking.status === "WAITING_VERIFICATION" ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleStatusChange(booking.id, "CONFIRMED")}
                              className={`${ACTION_BUTTON} border-[#1E3A8A] bg-[#1E3A8A] text-[#FAF9F6] hover:bg-[#141824] hover:border-[#141824]`}
                            >
                              Setujui
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStatusChange(booking.id, "REJECTED")}
                              className={`${ACTION_BUTTON} border-[#C84B31]/60 bg-[#FAF9F6] text-[#C84B31] hover:bg-[#C84B31] hover:text-[#FAF9F6]`}
                            >
                              Tolak
                            </button>
                          </>
                        ) : null}

                        {booking.status === "PENDING_PAYMENT" ? (
                          <button
                            type="button"
                            onClick={() => handleStatusChange(booking.id, "CANCELLED")}
                            className={`${ACTION_BUTTON} border-[#141824]/30 bg-[#FAF9F6] text-[#6E6A61] hover:border-[#C84B31] hover:text-[#C84B31]`}
                          >
                            Batalkan
                          </button>
                        ) : null}

                        {booking.status === "CONFIRMED" ? (
                          <button
                            type="button"
                            onClick={() => handleStatusChange(booking.id, "COMPLETED")}
                            className={`${ACTION_BUTTON} border-[#141824] bg-[#141824] text-[#FAF9F6] hover:bg-[#1E3A8A] hover:border-[#1E3A8A]`}
                          >
                            Selesai
                          </button>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => setSelectedBooking(booking)}
                          className={`${ACTION_BUTTON} border-[#141824]/30 bg-[#F5F3EE] text-[#141824] hover:border-[#141824]`}
                        >
                          Detail
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedBooking ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#141824]/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="booking-detail-heading"
        >
          <div className="w-full max-w-lg overflow-hidden rounded-[2px] border border-[#141824] bg-[#FAF9F6]">
            <header className="flex items-center justify-between border-b border-[#141824] bg-[#141824] px-4 py-3 text-[#FAF9F6]">
              <div>
                <span className="block font-mono text-[9px] uppercase tracking-[0.22em] text-[#EAE6DD]/60">
                  Detail reservasi
                </span>
                <h3 id="booking-detail-heading" className="font-display text-base font-bold">
                  {selectedBooking.id.slice(0, 12)}
                </h3>
              </div>
              <StatusBadge status={selectedBooking.status} />
            </header>

            <dl className="divide-y divide-[#141824]/15">
              {[
                { label: "Pemesan", value: selectedBooking.userName },
                { label: "Nomor HP", value: selectedBooking.userPhone },
                { label: "Lapangan", value: selectedBooking.court?.name || "-" },
                {
                  label: "Tanggal",
                  value: formatDateIndo(new Date(selectedBooking.date)),
                },
                {
                  label: "Jam",
                  value: formatTimeSlot({
                    startTime: selectedBooking.startTime,
                    endTime: selectedBooking.endTime,
                  }),
                },
                { label: "Harga", value: formatCurrency(selectedBooking.totalPrice) },
                {
                  label: "Dibuat",
                  value: new Date(selectedBooking.createdAt).toLocaleString("id-ID"),
                },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-baseline justify-between gap-4 px-4 py-2.5"
                >
                  <dt className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-[#6E6A61]">
                    {row.label}
                  </dt>
                  <dd className="text-right text-xs font-semibold text-[#141824]">{row.value}</dd>
                </div>
              ))}
            </dl>

            <div className="flex justify-end border-t border-[#141824]/20 bg-[#EAE6DD] px-4 py-3">
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="rounded-[2px] border border-[#141824] bg-[#FAF9F6] px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-[#141824] transition-colors hover:bg-[#141824] hover:text-[#FAF9F6]"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
