"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { StatusBadge } from "@/shared/components/status-badge";
import { formatCurrency } from "@/shared/lib/format";
import { toast } from "sonner";

interface Payment {
  id: string;
  bookingId: string;
  booking: { userName: string; userPhone: string; status: string };
  amount: number | string;
  status: string;
  proofUrl?: string | null;
  method?: string | null;
  rejectionReason?: string | null;
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
        toast.success(
          `Pembayaran berhasil di-${action === "APPROVE" ? "setujui" : "tolak"}`
        );
        fetchPayments();
        setSelectedPayment(null);
        setRejectionReason("");
      } else {
        toast.error(data.message ?? "Gagal memproses pembayaran");
      }
    } catch {
      toast.error("Gagal memproses pembayaran");
    }
  };

  const pendingCount = payments.filter((payment) => payment.status === "VERIFYING").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#141824] pb-3">
        <div>
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#C84B31]">
            Modul 04
          </span>
          <h1 className="mt-1 font-display text-xl font-bold tracking-tight sm:text-2xl">
            Manajemen Pembayaran
          </h1>
        </div>
        <span className="rounded-[2px] border border-[#C84B31]/50 bg-[#C84B31]/10 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-[#C84B31]">
          {pendingCount} menunggu review
        </span>
      </div>

      <section className="border border-[#141824] bg-[#FAF9F6]">
        {loading ? (
          <p className="px-4 py-10 text-center font-mono text-[11px] uppercase tracking-wider text-[#6E6A61]">
            Memuat data pembayaran…
          </p>
        ) : payments.length === 0 ? (
          <p className="px-4 py-10 text-center font-mono text-[11px] uppercase tracking-wider text-[#6E6A61]">
            Tidak ada data pembayaran
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#141824] bg-[#EAE6DD]">
                  {["ID Bayar", "Booking", "Pemesan", "Jumlah", "Status", "Aksi"].map((header) => (
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
                {payments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="border-b border-[#141824]/10 last:border-0 hover:bg-[#EAE6DD]/40"
                  >
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px] text-[#141824]">
                      {payment.id.slice(0, 8)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px] text-[#6E6A61]">
                      {payment.bookingId.slice(0, 8)}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-[#141824]">
                      <span className="block font-semibold">{payment.booking.userName}</span>
                      <span className="font-mono text-[10px] text-[#6E6A61]">
                        {payment.booking.userPhone}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px] font-semibold tabular-nums text-[#141824]">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <StatusBadge status={payment.status} />
                    </td>
                    <td className="px-3 py-2.5">
                      <button
                        type="button"
                        onClick={() => setSelectedPayment(payment)}
                        className="rounded-[2px] border border-[#141824]/30 bg-[#F5F3EE] px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-[#141824] transition-colors hover:border-[#141824] hover:bg-[#141824] hover:text-[#FAF9F6]"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedPayment ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#141824]/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="payment-review-heading"
        >
          <div className="my-auto w-full max-w-xl overflow-hidden rounded-[2px] border border-[#141824] bg-[#FAF9F6]">
            <header className="flex items-center justify-between border-b border-[#141824] bg-[#141824] px-4 py-3 text-[#FAF9F6]">
              <div>
                <span className="block font-mono text-[9px] uppercase tracking-[0.22em] text-[#EAE6DD]/60">
                  Verifikasi bukti
                </span>
                <h3 id="payment-review-heading" className="font-display text-base font-bold">
                  Review Pembayaran
                </h3>
              </div>
              <StatusBadge status={selectedPayment.status} />
            </header>

            <dl className="divide-y divide-[#141824]/15">
              <div className="flex items-baseline justify-between gap-4 px-4 py-2.5">
                <dt className="font-mono text-[10px] uppercase tracking-wider text-[#6E6A61]">
                  Pemesan
                </dt>
                <dd className="text-right text-xs font-semibold text-[#141824]">
                  {selectedPayment.booking.userName}
                  <span className="ml-1 font-mono text-[10px] font-normal text-[#6E6A61]">
                    {selectedPayment.booking.userPhone}
                  </span>
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 px-4 py-2.5">
                <dt className="font-mono text-[10px] uppercase tracking-wider text-[#6E6A61]">
                  Jumlah
                </dt>
                <dd className="font-mono text-sm font-bold tabular-nums text-[#141824]">
                  {formatCurrency(selectedPayment.amount)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 px-4 py-2.5">
                <dt className="font-mono text-[10px] uppercase tracking-wider text-[#6E6A61]">
                  Metode
                </dt>
                <dd className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#141824]">
                  {selectedPayment.method ?? "—"}
                </dd>
              </div>
            </dl>

            <div className="border-t border-[#141824]/15 p-4">
              <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-wider text-[#6E6A61]">
                Bukti transfer
              </p>
              {selectedPayment.proofUrl ? (
                <div className="border border-[#141824]/25 bg-[#F5F3EE] p-2">
                  <Image
                    src={selectedPayment.proofUrl}
                    alt="Bukti transfer"
                    width={600}
                    height={400}
                    unoptimized
                    className="h-auto w-full object-contain"
                  />
                </div>
              ) : (
                <p className="border border-dashed border-[#141824]/30 bg-[#F5F3EE] px-3 py-6 text-center font-mono text-[10px] uppercase tracking-wider text-[#6E6A61]">
                  Tidak ada berkas bukti untuk pembayaran ini
                </p>
              )}
            </div>

            {selectedPayment.status === "VERIFYING" ? (
              <div className="space-y-2.5 border-t border-[#141824]/20 bg-[#EAE6DD] p-4">
                <label
                  htmlFor="rejection-reason"
                  className="block font-mono text-[10px] font-bold uppercase tracking-wider text-[#141824]"
                >
                  Alasan penolakan (wajib jika ditolak)
                </label>
                <input
                  id="rejection-reason"
                  type="text"
                  value={rejectionReason}
                  onChange={(event) => setRejectionReason(event.target.value)}
                  placeholder="Contoh: nominal transfer kurang"
                  className="w-full rounded-[2px] border border-[#141824]/30 bg-[#FAF9F6] px-3 py-2 text-xs text-[#141824] outline-none focus:border-[#141824]"
                />
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => handleAction(selectedPayment.id, "APPROVE")}
                    className="rounded-[2px] border border-[#1E3A8A] bg-[#1E3A8A] px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-[#FAF9F6] transition-colors hover:bg-[#141824] hover:border-[#141824]"
                  >
                    Setujui (Lunas)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAction(selectedPayment.id, "REJECT")}
                    className="rounded-[2px] border border-[#C84B31] bg-[#C84B31] px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-[#FAF9F6] transition-colors hover:bg-[#141824] hover:border-[#141824]"
                  >
                    Tolak
                  </button>
                </div>
              </div>
            ) : null}

            <div className="flex justify-end border-t border-[#141824]/15 px-4 py-3">
              <button
                type="button"
                onClick={() => setSelectedPayment(null)}
                className="rounded-[2px] border border-[#141824]/30 bg-[#FAF9F6] px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-[#141824] transition-colors hover:border-[#141824] hover:bg-[#EAE6DD]"
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
