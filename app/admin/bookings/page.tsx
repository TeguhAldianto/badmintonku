"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDateIndo, formatTimeSlot } from "@/lib/booking";
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

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING_PAYMENT: "bg-gray-100 text-gray-700",
      WAITING_VERIFICATION: "bg-yellow-100 text-yellow-800",
      CONFIRMED: "bg-green-100 text-green-800",
      COMPLETED: "bg-blue-100 text-blue-800",
      CANCELLED: "bg-red-100 text-red-800",
      REJECTED: "bg-red-100 text-red-800",
      EXPIRED: "bg-gray-100 text-gray-500",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[status] || "bg-gray-100 text-gray-700"}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-text">Manajemen Booking</h1>
      </div>

      <Card className="card-custom mb-6">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
          <Input
            placeholder="Cari nama, nomor HP, atau kode booking..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs sm:max-w-md"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
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
        </CardContent>
      </Card>

      <Card className="card-custom">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">Memuat...</div>
          ) : bookings.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Tidak ada booking</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kode</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lapangan</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jam</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Harga</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {bookings.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-mono text-sm">{b.id.slice(0, 8)}</td>
                      <td className="px-6 py-4">{b.userName} ({b.userPhone})</td>
                      <td className="px-6 py-4">{b.court?.name || "-"}</td>
                      <td className="px-6 py-4">{formatDateIndo(new Date(b.date))}</td>
                      <td className="px-6 py-4">{formatTimeSlot({ startTime: b.startTime, endTime: b.endTime, status: "BOOKED" })}</td>
                      <td className="px-6 py-4">{getStatusBadge(b.status)}</td>
                      <td className="px-6 py-4 font-medium">Rp {Number(b.totalPrice).toLocaleString("id-ID")}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          {b.status === "WAITING_VERIFICATION" && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleStatusChange(b.id, "CONFIRMED")}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                Approve
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStatusChange(b.id, "REJECTED")}
                                className="text-red-600 border-red-600 hover:bg-red-50"
                              >
                                Reject
                              </Button>
                            </>
                          )}
                          {b.status === "PENDING_PAYMENT" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusChange(b.id, "CANCELLED")}
                              className="text-gray-600 border-gray-600 hover:bg-gray-50"
                            >
                              Batalkan
                            </Button>
                          )}
                          {b.status === "CONFIRMED" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusChange(b.id, "COMPLETED")}
                              className="text-blue-600 border-blue-600 hover:bg-blue-50"
                            >
                              Selesai
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedBooking(b)}
                          >
                            Detail
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h3 className="text-xl font-bold">Detail Booking</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500">Kode:</span> <span className="font-mono font-bold">{selectedBooking.id}</span></div>
                <div><span className="text-gray-500">Status:</span> {getStatusBadge(selectedBooking.status)}</div>
                <div className="col-span-2"><span className="text-gray-500">User:</span> {selectedBooking.userName} ({selectedBooking.userPhone})</div>
                <div><span className="text-gray-500">Lapangan:</span> {selectedBooking.court?.name || "-"}</div>
                <div><span className="text-gray-500">Tanggal:</span> {formatDateIndo(new Date(selectedBooking.date))}</div>
                <div className="col-span-2"><span className="text-gray-500">Jam:</span> {formatTimeSlot({ startTime: selectedBooking.startTime, endTime: selectedBooking.endTime, status: "BOOKED" })}</div>
                <div className="col-span-2"><span className="text-gray-500">Harga:</span> Rp {Number(selectedBooking.totalPrice).toLocaleString("id-ID")}</div>
                <div className="col-span-2"><span className="text-gray-500">Dibuat:</span> {new Date(selectedBooking.createdAt).toLocaleString("id-ID")}</div>
              </div>
              <div className="pt-4 border-t flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedBooking(null)}>Tutup</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}