"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge, getStatusLabel } from "@/shared/components/status-badge";
import { formatCurrency, formatDateIndo, formatTimeSlot } from "@/shared/lib/format";
import { useDialog } from "@/shared/lib/use-dialog";

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

interface BookingMeta {
  total: number;
  page: number;
  pageSize: number;
}

const PAGE_SIZE = 20;

const ACTION_BUTTON =
  "rounded-[2px] border px-2 py-1 font-mono text-[11px] font-bold uppercase tracking-wider transition-colors whitespace-nowrap min-h-10";

const STATUS_FILTERS = [
  { value: "all", label: "Semua Status" },
  { value: "PENDING_PAYMENT", label: "Menunggu Pembayaran" },
  { value: "WAITING_VERIFICATION", label: "Menunggu Verifikasi" },
  { value: "CONFIRMED", label: "Dikonfirmasi" },
  { value: "COMPLETED", label: "Selesai" },
  { value: "CANCELLED", label: "Dibatalkan" },
  { value: "REJECTED", label: "Ditolak" },
  { value: "EXPIRED", label: "Kadaluarsa" },
];

const STATUS_ACTION_COPY: Record<
  string,
  { title: string; description: string; confirmLabel: string; tone: "primary" | "danger" }
> = {
  CONFIRMED: {
    title: "Setujui booking ini?",
    description:
      "Booking akan berstatus Dikonfirmasi dan slot terkunci permanen untuk pemesan. Pastikan pembayaran sudah diterima.",
    confirmLabel: "Ya, setujui booking",
    tone: "primary",
  },
  REJECTED: {
    title: "Tolak booking ini?",
    description:
      "Booking akan berstatus Ditolak, pembayaran ditandai ditolak, dan slot dilepas. Tindakan ini tidak dapat diurungkan.",
    confirmLabel: "Ya, tolak booking",
    tone: "danger",
  },
  CANCELLED: {
    title: "Batalkan booking ini?",
    description:
      "Booking akan berstatus Dibatalkan dan slot langsung dilepas ke jadwal publik. Tindakan ini tidak dapat diurungkan.",
    confirmLabel: "Ya, batalkan booking",
    tone: "danger",
  },
  COMPLETED: {
    title: "Tandai booking selesai?",
    description:
      "Booking akan berstatus Selesai setelah pemain menyelesaikan sesi. Status ini bersifat final.",
    confirmLabel: "Ya, tandai selesai",
    tone: "primary",
  },
};

function BookingDetailDialog({
  booking,
  onClose,
}: {
  booking: Booking;
  onClose: () => void;
}) {
  const dialogRef = useDialog<HTMLDivElement>(onClose, true);

  const rows = [
    { label: "Pemesan", value: booking.userName },
    { label: "Nomor HP", value: booking.userPhone },
    { label: "Lapangan", value: booking.court?.name || "-" },
    { label: "Tanggal", value: formatDateIndo(new Date(booking.date)) },
    {
      label: "Jam",
      value: formatTimeSlot({ startTime: booking.startTime, endTime: booking.endTime }),
    },
    { label: "Harga", value: formatCurrency(booking.totalPrice) },
    { label: "Dibuat", value: new Date(booking.createdAt).toLocaleString("id-ID") },
    { label: "Status", value: getStatusLabel(booking.status) },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-detail-heading"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="w-full max-w-lg overflow-hidden rounded-[2px] border border-navy bg-paper"
      >
        <header className="flex items-center justify-between border-b border-navy bg-navy px-4 py-3 text-paper">
          <div>
            <span className="block font-mono text-[11px] uppercase tracking-[0.22em] text-birch/70">
              Detail reservasi
            </span>
            <h3 id="booking-detail-heading" className="font-display text-base font-bold">
              {booking.id.slice(0, 12)}
            </h3>
          </div>
          <StatusBadge status={booking.status} />
        </header>

        <dl className="divide-y divide-navy/15">
          {rows.map((row) => (
            <div key={row.label} className="flex items-baseline justify-between gap-4 px-4 py-2.5">
              <dt className="shrink-0 font-mono text-[12px] uppercase tracking-wider text-slate-muted">
                {row.label}
              </dt>
              <dd className="text-right text-xs font-semibold text-navy">{row.value}</dd>
            </div>
          ))}
        </dl>

        <div className="flex justify-end border-t border-navy/20 bg-birch px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-[2px] border border-navy bg-paper px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-wider text-navy transition-colors hover:bg-navy hover:text-paper"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusConfirmDialog({
  booking,
  nextStatus,
  loading,
  onCancel,
  onConfirm,
}: {
  booking: Booking;
  nextStatus: string;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dialogRef = useDialog<HTMLDivElement>(onCancel, !loading);
  const copy = STATUS_ACTION_COPY[nextStatus];
  if (!copy) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy/70 p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="status-confirm-heading"
      aria-describedby="status-confirm-description"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="w-full max-w-md overflow-hidden rounded-[2px] border border-navy bg-paper"
      >
        <header className="border-b border-navy bg-navy px-4 py-3 text-paper">
          <h3 id="status-confirm-heading" className="font-display text-base font-bold">
            {copy.title}
          </h3>
        </header>
        <div className="space-y-3 p-4">
          <p id="status-confirm-description" className="text-xs leading-relaxed text-slate-muted">
            {copy.description}
          </p>
          <dl className="space-y-1 rounded-[2px] border border-navy/20 bg-chalk p-3 font-mono text-[11px] text-navy">
            <div className="flex justify-between gap-3">
              <dt className="text-slate-muted">Pemesan</dt>
              <dd className="font-semibold">{booking.userName}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-muted">Jadwal</dt>
              <dd className="font-semibold">
                {formatDateIndo(new Date(booking.date))} ·{" "}
                {formatTimeSlot({ startTime: booking.startTime, endTime: booking.endTime })}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-muted">Status baru</dt>
              <dd className="font-semibold">{getStatusLabel(nextStatus)}</dd>
            </div>
          </dl>
        </div>
        <div className="flex flex-col gap-2 border-t border-navy/20 bg-birch px-4 py-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`${ACTION_BUTTON} min-h-11 px-4 disabled:opacity-50 ${
              copy.tone === "danger"
                ? "border-terracotta bg-terracotta text-paper hover:border-navy hover:bg-navy"
                : "border-cobalt bg-cobalt text-paper hover:border-navy hover:bg-navy"
            }`}
          >
            {loading ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} />
                Memproses…
              </span>
            ) : (
              copy.confirmLabel
            )}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className={`${ACTION_BUTTON} min-h-11 border-navy/40 bg-paper px-4 text-navy hover:border-navy disabled:opacity-50`}
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [meta, setMeta] = useState<BookingMeta>({ total: 0, page: 1, pageSize: PAGE_SIZE });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [pendingStatus, setPendingStatus] = useState<{ booking: Booking; status: string } | null>(
    null
  );
  const [updating, setUpdating] = useState(false);

  // Debounce the search field so typing does not fire a request per keystroke.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/admin/bookings?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message ?? "Gagal memuat booking");
      }
      setBookings(data.data || []);
      setMeta({
        total: data.meta?.total ?? 0,
        page: data.meta?.page ?? page,
        pageSize: data.meta?.pageSize ?? PAGE_SIZE,
      });
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Gagal memuat booking");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchBookings();
  }, [fetchBookings]);

  const handleStatusChange = async (bookingId: string, newStatus: string) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Status booking diperbarui menjadi ${getStatusLabel(newStatus)}`);
        setPendingStatus(null);
        await fetchBookings();
      } else {
        toast.error(data.message ?? "Gagal mengubah status booking");
      }
    } catch {
      toast.error("Gagal mengubah status booking");
    } finally {
      setUpdating(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(meta.total / meta.pageSize));
  const from = meta.total === 0 ? 0 : (meta.page - 1) * meta.pageSize + 1;
  const to = Math.min(meta.total, meta.page * meta.pageSize);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-navy pb-3">
        <div>
          <span className="font-mono text-[12px] font-bold uppercase tracking-[0.22em] text-terracotta">
            Modul 03
          </span>
          <h1 className="mt-1 font-display text-xl font-bold tracking-tight sm:text-2xl">
            Manajemen Booking
          </h1>
        </div>
        <span className="font-mono text-[11px] uppercase tracking-wider text-slate-muted">
          {loading ? "Memuat…" : `${from}–${to} dari ${meta.total} booking`}
        </span>
      </div>

      <div className="flex flex-col gap-2 border border-navy bg-birch p-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label
            htmlFor="booking-search"
            className="mb-1 block font-mono text-[11px] font-bold uppercase tracking-wider text-navy"
          >
            Cari booking
          </label>
          <Input
            id="booking-search"
            placeholder="Cari nama, nomor HP, atau kode booking…"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            className="max-w-md bg-paper"
          />
        </div>
        <div>
          <label
            htmlFor="booking-status-filter"
            className="mb-1 block font-mono text-[11px] font-bold uppercase tracking-wider text-navy"
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
            <SelectTrigger id="booking-status-filter" className="w-full bg-paper sm:w-[220px]">
              <SelectValue placeholder="Semua Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <section className="border border-navy bg-paper">
        {loading ? (
          <p className="px-4 py-10 text-center font-mono text-[12px] uppercase tracking-wider text-slate-muted">
            Memuat data booking…
          </p>
        ) : error ? (
          <div className="space-y-3 px-4 py-10 text-center">
            <p className="font-mono text-[12px] uppercase tracking-wider text-terracotta">
              Gagal memuat data booking
            </p>
            <p className="text-xs text-slate-muted">{error}</p>
            <button
              type="button"
              onClick={fetchBookings}
              className="min-h-11 rounded-[2px] border border-navy bg-navy px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-wider text-paper"
            >
              Coba lagi
            </button>
          </div>
        ) : bookings.length === 0 ? (
          <p className="px-4 py-10 text-center font-mono text-[12px] uppercase tracking-wider text-slate-muted">
            Tidak ada booking yang cocok dengan filter
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] border-collapse text-left">
              <thead>
                <tr className="border-b border-navy bg-birch">
                  {["Kode", "Pemesan", "Lapangan", "Tanggal", "Jam", "Status", "Harga", "Aksi"].map(
                    (header) => (
                      <th
                        key={header}
                        scope="col"
                        className="whitespace-nowrap px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-wider text-navy"
                      >
                        {header}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr
                    key={booking.id}
                    className="border-b border-navy/10 last:border-0 hover:bg-birch/40"
                  >
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px] text-navy">
                      {booking.id.slice(0, 8)}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-navy">
                      <span className="block font-semibold">{booking.userName}</span>
                      <span className="font-mono text-[11px] text-slate-muted">
                        {booking.userPhone}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-xs text-navy">
                      {booking.court?.name || "-"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px] text-slate-muted">
                      {formatDateIndo(new Date(booking.date))}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px] tabular-nums text-navy">
                      {formatTimeSlot({ startTime: booking.startTime, endTime: booking.endTime })}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <StatusBadge status={booking.status} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px] font-semibold tabular-nums text-navy">
                      {formatCurrency(booking.totalPrice)}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {booking.status === "WAITING_VERIFICATION" ? (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                setPendingStatus({ booking, status: "CONFIRMED" })
                              }
                              className={`${ACTION_BUTTON} border-cobalt bg-cobalt text-paper hover:border-navy hover:bg-navy`}
                            >
                              Setujui
                            </button>
                            <button
                              type="button"
                              onClick={() => setPendingStatus({ booking, status: "REJECTED" })}
                              className={`${ACTION_BUTTON} border-terracotta/60 bg-paper text-terracotta hover:bg-terracotta hover:text-paper`}
                            >
                              Tolak
                            </button>
                          </>
                        ) : null}

                        {booking.status === "PENDING_PAYMENT" ? (
                          <button
                            type="button"
                            onClick={() => setPendingStatus({ booking, status: "CANCELLED" })}
                            className={`${ACTION_BUTTON} border-navy/30 bg-paper text-slate-muted hover:border-terracotta hover:text-terracotta`}
                          >
                            Batalkan
                          </button>
                        ) : null}

                        {booking.status === "CONFIRMED" ? (
                          <button
                            type="button"
                            onClick={() => setPendingStatus({ booking, status: "COMPLETED" })}
                            className={`${ACTION_BUTTON} border-navy bg-navy text-paper hover:border-cobalt hover:bg-cobalt`}
                          >
                            Selesai
                          </button>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => setSelectedBooking(booking)}
                          className={`${ACTION_BUTTON} border-navy/30 bg-chalk text-navy hover:border-navy`}
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

      {meta.total > meta.pageSize ? (
        <nav
          aria-label="Navigasi halaman booking"
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

      {selectedBooking ? (
        <BookingDetailDialog booking={selectedBooking} onClose={() => setSelectedBooking(null)} />
      ) : null}

      {pendingStatus ? (
        <StatusConfirmDialog
          booking={pendingStatus.booking}
          nextStatus={pendingStatus.status}
          loading={updating}
          onCancel={() => setPendingStatus(null)}
          onConfirm={() => handleStatusChange(pendingStatus.booking.id, pendingStatus.status)}
        />
      ) : null}
    </div>
  );
}
