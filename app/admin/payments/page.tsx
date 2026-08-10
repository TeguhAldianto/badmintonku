"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Payment {
  id: string;
  bookingId: string;
  booking: { userName: string; userPhone: string };
  amount: number;
  status: string;
  proofUrl?: string;
  method?: string;
  rejectionReason?: string;
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/payments");
      const data = await res.json();
      setPayments(data.data || []);
    } catch {
      toast.error("Gagal memuat pembayaran");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPayments();
  }, [fetchPayments]);

  const handleAction = async (paymentId: string, action: "APPROVE" | "REJECT") => {
    if (action === "REJECT" && !rejectionReason.trim()) {
      toast.error("Alasan penolakan wajib diisi");
      return;
    }

    try {
      const res = await fetch(`/api/admin/payments/${paymentId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, rejectionReason }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Pembayaran berhasil di-${action === "APPROVE" ? "approve" : "reject"}`);
        fetchPayments();
        setSelectedPayment(null);
        setRejectionReason("");
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error("Gagal memproses pembayaran");
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-text">Manajemen Pembayaran</h1>

      <Card className="card-custom">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">Memuat...</div>
          ) : payments.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Tidak ada data pembayaran</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID Pembayaran</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Booking ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jumlah</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-mono text-sm">{p.id.slice(0, 8)}</td>
                      <td className="px-6 py-4 font-mono text-sm">{p.bookingId.slice(0, 8)}</td>
                      <td className="px-6 py-4">{p.booking.userName} ({p.booking.userPhone})</td>
                      <td className="px-6 py-4 font-medium">Rp {Number(p.amount).toLocaleString("id-ID")}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          p.status === "UNPAID" ? "bg-gray-100 text-gray-700" :
                          p.status === "VERIFYING" ? "bg-yellow-100 text-yellow-800" :
                          p.status === "PAID" ? "bg-green-100 text-green-800" :
                          "bg-red-100 text-red-800"
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedPayment(p)}>
                          Review
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl max-w-xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h3 className="text-xl font-bold">Review Pembayaran</h3>
            </div>
            <div className="p-6 space-y-4">
              <div><span className="text-gray-500">Pemesan:</span> {selectedPayment.booking.userName} ({selectedPayment.booking.userPhone})</div>
              <div><span className="text-gray-500">Jumlah:</span> Rp {Number(selectedPayment.amount).toLocaleString("id-ID")}</div>
              <div><span className="text-gray-500">Status:</span> {selectedPayment.status}</div>
              {selectedPayment.proofUrl && (
                <div>
                  <p className="text-gray-500 mb-2">Bukti Transfer:</p>
                  <div className="border p-2 rounded-lg bg-gray-50 h-48 flex items-center justify-center text-gray-400">
                    [Preview Bukti: {selectedPayment.proofUrl}]
                  </div>
                </div>
              )}
              {selectedPayment.status === "VERIFYING" && (
                <div className="space-y-4 pt-4 border-t">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Alasan Penolakan (Jika ditolak):</label>
                    <input
                      type="text"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Contoh: Nominal kurang"
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      onClick={() => handleAction(selectedPayment.id, "APPROVE")}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      Approve (Paid)
                    </Button>
                    <Button
                      onClick={() => handleAction(selectedPayment.id, "REJECT")}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              )}
              <div className="pt-4 border-t flex justify-end">
                <Button variant="outline" onClick={() => setSelectedPayment(null)}>Tutup</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}