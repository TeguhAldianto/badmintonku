"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/shared/components/status-badge";
import { formatCurrency } from "@/shared/lib/format";
import { getPaymentMethodLabel } from "@/features/payment/constants";
import { useDialog } from "@/shared/lib/use-dialog";

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

interface PaymentMeta {
  total: number;
  page: number;
  pageSize: number;
  counts?: Record<string, number>;
}

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: "all", label: "Semua Status" },
  { value: "VERIFYING", label: "Menunggu Verifikasi" },
  { value: "PAID", label: "Lunas" },
  { value: "UNPAID", label: "Belum Dibayar" },
  { value: "REJECTED", label: "Ditolak" },
];

const ACTION_BUTTON =
  "rounded-[2px] border px-2 py-1 font-mono text-[11px] font-bold uppercase tracking-wider transition-colors whitespace-nowrap";

function PaymentReviewDialog({
  payment,
  onClose,
  onUpdated,
}: {
  payment: Payment;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [rejectionReason, setRejectionReason] = useState("");
  const [pendingAction, setPendingAction] = useState<"APPROVE" | "REJECT" | null>(null);
  const [actioning, setActioning] = useState<"APPROVE" | "REJECT" | null>(null);
  const [error, setError] = useState("");
  const dialogRef = useDialog<HTMLDivElement>(onClose, true);

  const runAction = async (action: "APPROVE" | "REJECT") => {
    if (action === "REJECT" && !rejectionReason.trim()) {
      setError("Alasan penolakan wajib diisi sebelum menolak pembayaran.");
      setPendingAction(null);
      return;
    }

    setActioning(action);
    setError("");
    try {
      const res = await fetch(`/api/admin/payments/${payment.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, rejectionReason: rejectionReason.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          action === "APPROVE"
            ? "Pembayaran disetujui dan booking dikonfirmasi"
            : "Pembayaran ditolak dan pemesan akan dihubungi"
        );
        onUpdated();
        onClose();
      } else {
        setError(data.message ?? "Gagal memproses pembayaran");
      }
    } catch {
      setError("Gagal memproses pembayaran. Periksa koneksi lalu coba lagi.");
    } finally {
      setActioning(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-review-heading"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="my-auto w-full max-w-xl overflow-hidden rounded-[2px] border border-navy bg-paper"
      >
        <header className="flex items-center justify-between border-b border-navy bg-navy px-4 py-3 text-paper">
          <div>
            <span className="block font-mono text-[11px] uppercase tracking-[0.22em] text-birch/70">
              Verifikasi bukti
            </span>
            <h3 id="payment-review-heading" className="font-display text-base font-bold">
              Review Pembayaran
            </h3>
          </div>
          <StatusBadge status={payment.status} />
        </header>

        <dl className="divide-y divide-navy/15">
          <div className="flex items-baseline justify-between gap-4 px-4 py-2.5">
            <dt className="font-mono text-[12px] uppercase tracking-wider text-slate-muted">Pemesan</dt>
            <dd className="text-right text-xs font-semibold text-navy">
              {payment.booking.userName}
              <span className="ml-1 font-mono text-[11px] font-normal text-slate-muted">
                {payment.booking.userPhone}
              </span>
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 px-4 py-2.5">
            <dt className="font-mono text-[12px] uppercase tracking-wider text-slate-muted">Jumlah</dt>
            <dd className="font-mono text-sm font-bold tabular-nums text-navy">
              {formatCurrency(payment.amount)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 px-4 py-2.5">
            <dt className="font-mono text-[12px] uppercase tracking-wider text-slate-muted">Metode</dt>
            <dd className="font-mono text-[12px] font-semibold uppercase tracking-wider text-navy">
              {getPaymentMethodLabel(payment.method)}
            </dd>
          </div>
        </dl>

        <div className="border-t border-navy/15 p-4">
          <p className="mb-2 font-mono text-[12px] font-bold uppercase tracking-wider text-slate-muted">
            Bukti transfer
          </p>
          {payment.proofUrl ? (
            <div className="border border-navy/25 bg-chalk p-2">
              <Image
                src={
                  payment.proofUrl.startsWith("payments/") || !payment.proofUrl.startsWith("/")
                    ? `/api/payments/${payment.id}/proof`
                    : payment.proofUrl
                }
                alt={`Bukti transfer ${payment.booking.userName} sebesar ${formatCurrency(payment.amount)}`}
                width={600}
                height={400}
                unoptimized
                className="h-auto w-full object-contain"
              />
            </div>
          ) : (
            <p className="border border-dashed border-navy/30 bg-chalk px-3 py-6 text-center font-mono text-[11px] uppercase tracking-wider text-slate-muted">
              Tidak ada berkas bukti untuk pembayaran ini
            </p>
          )}
        </div>

        {payment.status === "VERIFYING" ? (
          <div className="space-y-2.5 border-t border-navy/20 bg-birch p-4">
            <label
              htmlFor="rejection-reason"
              className="block font-mono text-[12px] font-bold uppercase tracking-wider text-navy"
            >
              Alasan penolakan (wajib jika ditolak)
            </label>
            <input
              id="rejection-reason"
              type="text"
              value={rejectionReason}
              onChange={(event) => {
                setRejectionReason(event.target.value);
                if (error) setError("");
              }}
              placeholder="Contoh: nominal transfer kurang"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "payment-action-error" : undefined}
              className="w-full rounded-[2px] border border-navy/30 bg-paper px-3 py-2 text-xs text-navy outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt focus:border-navy"
            />

            {error ? (
              <p
                id="payment-action-error"
                role="alert"
                className="rounded-[2px] border border-terracotta/50 bg-terracotta/10 px-3 py-2 font-mono text-[11px] uppercase tracking-wide text-terracotta"
              >
                {error}
              </p>
            ) : null}

            {pendingAction ? (
              <div className="rounded-[2px] border border-navy bg-paper p-3">
                <p className="font-mono text-[11px] uppercase leading-relaxed tracking-wide text-navy">
                  {pendingAction === "APPROVE"
                    ? `Setujui pembayaran ${formatCurrency(payment.amount)} dan konfirmasi booking ${payment.booking.userName}? Pastikan nominal dan bukti sudah sesuai.`
                    : `Tolak pembayaran ${payment.booking.userName}? Alasan akan dikirim ke pemesan dan tidak dapat diurungkan.`}
                </p>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    disabled={Boolean(actioning)}
                    onClick={() => runAction(pendingAction)}
                    className={`${ACTION_BUTTON} min-h-11 px-3 ${
                      pendingAction === "APPROVE"
                        ? "border-cobalt bg-cobalt text-paper hover:bg-navy hover:border-navy"
                        : "border-terracotta bg-terracotta text-paper hover:bg-navy hover:border-navy"
                    } disabled:opacity-50`}
                  >
                    {actioning ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} />
                        Memproses…
                      </span>
                    ) : pendingAction === "APPROVE" ? (
                      "Ya, setujui (lunas)"
                    ) : (
                      "Ya, tolak"
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(actioning)}
                    onClick={() => setPendingAction(null)}
                    className={`${ACTION_BUTTON} min-h-11 border-navy/40 bg-paper px-3 text-navy hover:border-navy disabled:opacity-50`}
                  >
                    Batal
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={Boolean(actioning)}
                  onClick={() => setPendingAction("APPROVE")}
                  className={`${ACTION_BUTTON} min-h-11 border-cobalt bg-cobalt px-4 text-paper hover:border-navy hover:bg-navy disabled:opacity-50`}
                >
                  Setujui (Lunas)
                </button>
                <button
                  type="button"
                  disabled={Boolean(actioning)}
                  onClick={() => {
                    if (!rejectionReason.trim()) {
                      setError("Alasan penolakan wajib diisi sebelum menolak pembayaran.");
                      return;
                    }
                    setPendingAction("REJECT");
                  }}
                  className={`${ACTION_BUTTON} min-h-11 border-terracotta bg-terracotta px-4 text-paper hover:border-navy hover:bg-navy disabled:opacity-50`}
                >
                  Tolak
                </button>
              </div>
            )}
          </div>
        ) : null}

        <div className="flex justify-end border-t border-navy/15 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={Boolean(actioning)}
            className="min-h-11 rounded-[2px] border border-navy/30 bg-paper px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-wider text-navy transition-colors hover:border-navy hover:bg-birch disabled:opacity-50"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [meta, setMeta] = useState<PaymentMeta>({ total: 0, page: 1, pageSize: PAGE_SIZE });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/admin/payments?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message ?? "Gagal memuat pembayaran");
      }
      setPayments(data.data || []);
      setMeta({
        total: data.meta?.total ?? 0,
        page: data.meta?.page ?? page,
        pageSize: data.meta?.pageSize ?? PAGE_SIZE,
        counts: data.meta?.counts ?? {},
      });
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Gagal memuat pembayaran");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPayments();
  }, [fetchPayments]);

  const pendingCount = meta.counts?.VERIFYING ?? 0;
  const totalPages = Math.max(1, Math.ceil(meta.total / meta.pageSize));
  const from = meta.total === 0 ? 0 : (meta.page - 1) * meta.pageSize + 1;
  const to = Math.min(meta.total, meta.page * meta.pageSize);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-navy pb-3">
        <div>
          <span className="font-mono text-[12px] font-bold uppercase tracking-[0.22em] text-terracotta">
            Modul 04
          </span>
          <h1 className="mt-1 font-display text-xl font-bold tracking-tight sm:text-2xl">
            Manajemen Pembayaran
          </h1>
        </div>
        <span className="rounded-[2px] border border-terracotta/50 bg-terracotta/10 px-2 py-1 font-mono text-[12px] font-bold uppercase tracking-wider text-terracotta">
          {pendingCount} menunggu review
        </span>
      </div>

      <div className="flex flex-col gap-2 border border-navy bg-birch p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <label
            htmlFor="payment-status-filter"
            className="font-mono text-[11px] font-bold uppercase tracking-wider text-navy"
          >
            Filter status
          </label>
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value);
              setPage(1);
            }}
          >
            <SelectTrigger id="payment-status-filter" className="w-[200px] bg-paper">
              <SelectValue placeholder="Semua Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span className="font-mono text-[11px] uppercase tracking-wider text-slate-muted">
          {loading ? "Memuat…" : `${from}–${to} dari ${meta.total} pembayaran`}
        </span>
      </div>

      <section className="border border-navy bg-paper">
        {loading ? (
          <p className="px-4 py-10 text-center font-mono text-[12px] uppercase tracking-wider text-slate-muted">
            Memuat data pembayaran…
          </p>
        ) : error ? (
          <div className="space-y-3 px-4 py-10 text-center">
            <p className="font-mono text-[12px] uppercase tracking-wider text-terracotta">
              Gagal memuat data pembayaran
            </p>
            <p className="text-xs text-slate-muted">{error}</p>
            <button
              type="button"
              onClick={fetchPayments}
              className="min-h-11 rounded-[2px] border border-navy bg-navy px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-wider text-paper"
            >
              Coba lagi
            </button>
          </div>
        ) : payments.length === 0 ? (
          <p className="px-4 py-10 text-center font-mono text-[12px] uppercase tracking-wider text-slate-muted">
            Tidak ada pembayaran pada filter ini
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-left">
              <thead>
                <tr className="border-b border-navy bg-birch">
                  {["ID Bayar", "Booking", "Pemesan", "Jumlah", "Status", "Aksi"].map((header) => (
                    <th
                      key={header}
                      scope="col"
                      className="whitespace-nowrap px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-wider text-navy"
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
                    className="border-b border-navy/10 last:border-0 hover:bg-birch/40"
                  >
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px] text-navy">
                      {payment.id.slice(0, 8)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px] text-slate-muted">
                      {payment.bookingId.slice(0, 8)}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-navy">
                      <span className="block font-semibold">{payment.booking.userName}</span>
                      <span className="font-mono text-[11px] text-slate-muted">
                        {payment.booking.userPhone}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px] font-semibold tabular-nums text-navy">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <StatusBadge status={payment.status} />
                    </td>
                    <td className="px-3 py-2.5">
                      <button
                        type="button"
                        onClick={() => setSelectedPayment(payment)}
                        className="min-h-11 rounded-[2px] border border-navy/30 bg-chalk px-2.5 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-navy transition-colors hover:border-navy hover:bg-navy hover:text-paper"
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

      {meta.total > meta.pageSize ? (
        <nav
          aria-label="Navigasi halaman pembayaran"
          className="flex flex-wrap items-center justify-between gap-2 border border-navy/25 bg-paper px-3 py-2"
        >
          <span className="font-mono text-[11px] uppercase tracking-wider text-slate-muted">
            Halaman {meta.page} dari {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={meta.page <= 1 || loading}
              className="min-h-11 rounded-[2px] border border-navy/30 bg-paper px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-navy disabled:opacity-40"
            >
              Sebelumnya
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={meta.page >= totalPages || loading}
              className="min-h-11 rounded-[2px] border border-navy/30 bg-paper px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-navy disabled:opacity-40"
            >
              Berikutnya
            </button>
          </div>
        </nav>
      ) : null}

      {selectedPayment ? (
        <PaymentReviewDialog
          key={selectedPayment.id}
          payment={selectedPayment}
          onClose={() => setSelectedPayment(null)}
          onUpdated={fetchPayments}
        />
      ) : null}
    </div>
  );
}
