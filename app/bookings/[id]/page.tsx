"use client";

import { useCallback, useEffect, useRef, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Copy, Loader2, XCircle } from "lucide-react";

import { StatusBadge, getStatusLabel } from "@/shared/components/status-badge";
import { formatCurrency, formatDateIndo, formatTimeSlot, maskPhone } from "@/shared/lib/format";
import {
  BANK_TRANSFER_DETAILS,
  PAYMENT_METHOD_META,
  isPaymentMethod,
  type PaymentMethod,
} from "@/features/payment/constants";

interface BookingData {
  id: string;
  status: string;
  court: { id: number; name: string };
  date: string;
  startTime: number;
  endTime: number;
  userName: string;
  userPhoneMasked: string;
  userPhone?: string;
  totalPrice: number;
  expiresAt: string;
  payment: {
    status: string;
    method: string | null;
    proofUrl: string | null;
    rejectionReason: string | null;
    midtransOrderId: string | null;
  } | null;
}

const PAYMENT_METHOD_OPTIONS: PaymentMethod[] = ["BANK_TRANSFER", "QRIS", "DIRECT"];

const CANCELLABLE_STATUSES = ["PENDING_PAYMENT", "WAITING_VERIFICATION", "CONFIRMED"];

const FIELD_CLASS =
  "w-full rounded-[2px] border border-navy/30 bg-chalk px-3 py-2.5 text-sm text-navy outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt transition-colors placeholder:text-slate-muted/70 focus:border-navy disabled:cursor-not-allowed disabled:opacity-50";

const BUTTON_PRIMARY =
  "flex w-full min-h-11 items-center justify-center gap-2 rounded-[2px] border border-navy bg-terracotta px-4 py-3.5 font-mono text-xs font-bold uppercase tracking-wider text-paper transition-colors hover:bg-navy disabled:cursor-not-allowed disabled:opacity-45";

const BUTTON_SECONDARY =
  "flex w-full min-h-11 items-center justify-center gap-2 rounded-[2px] border border-navy/30 bg-paper px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-wider text-navy transition-colors hover:border-navy hover:bg-birch disabled:cursor-not-allowed disabled:opacity-45";

const BUTTON_DANGER =
  "flex w-full min-h-11 items-center justify-center gap-2 rounded-[2px] border border-terracotta bg-paper px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-wider text-terracotta transition-colors hover:bg-terracotta hover:text-paper disabled:cursor-not-allowed disabled:opacity-45";

function formatCountdown(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

export default function BookingConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [paying, setPaying] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savingMethod, setSavingMethod] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("BANK_TRANSFER");
  // Live clock so the payment window actually counts down while the page stays open.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const fetchBooking = useCallback(async () => {
    try {
      const res = await fetch(`/api/bookings/${id}`, { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        setBooking(data.data);
      } else {
        toast.error(data.message ?? "Booking tidak ditemukan");
      }
    } catch {
      toast.error("Gagal memuat booking");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchBooking();
  }, [fetchBooking]);

  const statusRef = useRef<string | null>(null);

  useEffect(() => {
    statusRef.current = booking?.status ?? null;
  }, [booking?.status]);

  /**
   * Background refresh while the guest waits for payment/verification.
   * It stays silent on network failure so it never fights the countdown UI,
   * but announces the moment the status actually changes.
   */
  const refreshBookingSilently = useCallback(async () => {
    try {
      const res = await fetch(`/api/bookings/${id}`, { cache: "no-store" });
      const data = await res.json();
      if (!data.success || !data.data) return;
      const next = data.data as BookingData;
      if (statusRef.current && statusRef.current !== next.status) {
        toast.success(`Status reservasi diperbarui: ${getStatusLabel(next.status)}`);
      }
      statusRef.current = next.status;
      setBooking(next);
    } catch {
      // Offline or a blip: the manual "Muat ulang status" button still exists.
    }
  }, [id]);

  const shouldAutoRefresh =
    booking?.status === "PENDING_PAYMENT" || booking?.status === "WAITING_VERIFICATION";

  useEffect(() => {
    if (!shouldAutoRefresh) return;
    const timer = window.setInterval(() => {
      // Pause polling in background tabs to avoid wasted requests.
      if (document.visibilityState === "visible") void refreshBookingSilently();
    }, 20_000);
    return () => window.clearInterval(timer);
  }, [shouldAutoRefresh, refreshBookingSilently]);

  const requirePhone = (): string | null => {
    if (!phone.trim()) {
      setPhoneError("Nomor HP wajib diisi dan harus sama dengan nomor saat reservasi.");
      return null;
    }
    setPhoneError("");
    return phone;
  };

  /**
   * Asks Midtrans for the live transaction status and applies it locally.
   * Needed because Midtrans only calls public webhook URLs, so on localhost the
   * notification never arrives.
   */
  const syncPaymentStatus = useCallback(
    async (phoneValue: string) => {
      if (!booking) return;

      if (!phoneValue.trim()) {
        toast.error("Masukkan nomor HP yang dipakai saat booking");
        return;
      }

      setSyncing(true);
      try {
        const res = await fetch(`/api/payments/${booking.id}/status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userPhone: phoneValue }),
        });
        const data = await res.json();

        if (data.success) {
          toast.success(data.data?.message || "Status pembayaran diperbarui");
        } else {
          toast.error(data.message || "Gagal mengecek status pembayaran");
        }

        await fetchBooking();
      } catch {
        toast.error("Gagal mengecek status pembayaran");
      } finally {
        setSyncing(false);
      }
    },
    [booking, fetchBooking]
  );

  const handleMidtransPayment = async () => {
    if (!booking) return;
    const phoneValue = requirePhone();
    if (!phoneValue) return;

    setPaying(true);

    try {
      const res = await fetch("/api/payments/midtrans/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingCode: booking.id, userPhone: phoneValue }),
      });
      const data = await res.json();

      if (!data.success) {
        toast.error(data.message || "Gagal membuat token pembayaran");
        return;
      }

      const { token, redirectUrl } = data.data;
      const snapWindow = window as unknown as {
        snap?: { pay: (token: string, options: Record<string, unknown>) => void };
      };

      if (snapWindow.snap) {
        snapWindow.snap.pay(token, {
          onSuccess: async () => {
            toast.success("Pembayaran berhasil! Menunggu verifikasi...");
            await syncPaymentStatus(phoneValue);
          },
          onPending: async () => {
            toast("Pembayaran pending, menunggu verifikasi...");
            await syncPaymentStatus(phoneValue);
          },
          onError: () => toast.error("Pembayaran gagal"),
          onClose: () => setPaying(false),
        });
      } else {
        window.location.assign(redirectUrl);
      }
    } catch {
      toast.error("Gagal memproses pembayaran");
    } finally {
      setPaying(false);
    }
  };

  const handleSelectDirect = async () => {
    if (!booking) return;
    const phoneValue = requirePhone();
    if (!phoneValue) return;

    setSavingMethod(true);
    try {
      const res = await fetch(`/api/payments/${booking.id}/method`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userPhone: phoneValue, method: "DIRECT" }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Metode bayar di tempat disimpan. Tunjukkan kode booking saat check-in.");
        await fetchBooking();
      } else {
        toast.error(data.message ?? "Gagal menyimpan metode pembayaran");
      }
    } catch {
      toast.error("Gagal menyimpan metode pembayaran");
    } finally {
      setSavingMethod(false);
    }
  };

  const handleProofUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!booking) return;

    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast.error("Pilih file bukti pembayaran");
      return;
    }
    const phoneValue = requirePhone();
    if (!phoneValue) return;

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("method", method);
      formData.append("userPhone", phoneValue);

      const res = await fetch(`/api/payments/${booking.id}/proof`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        toast.success("Bukti pembayaran berhasil diupload");
        if (fileInputRef.current) fileInputRef.current.value = "";
        await fetchBooking();
      } else {
        toast.error(data.message ?? "Gagal upload bukti pembayaran");
      }
    } catch {
      toast.error("Gagal upload bukti pembayaran");
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = async () => {
    if (!booking) return;
    const phoneValue = requirePhone();
    if (!phoneValue) return;

    setCancelling(true);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userPhone: phoneValue }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success("Reservasi dibatalkan");
        setConfirmingCancel(false);
        await fetchBooking();
      } else {
        toast.error(data.message ?? "Gagal membatalkan reservasi");
      }
    } catch {
      toast.error("Gagal membatalkan reservasi");
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="flex items-center gap-2 font-mono text-[12px] uppercase tracking-wider text-slate-muted">
          <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
          Memuat detail reservasi…
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="rounded-[2px] border border-navy bg-paper p-6">
          <h1 className="font-display text-xl font-bold text-navy">Reservasi tidak ditemukan</h1>
          <p className="mt-1.5 text-sm text-slate-muted">
            Kode booking tidak cocok dengan data arena. Periksa kembali tautan tiket Anda.
          </p>
          <Link
            href="/bookings"
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-[2px] border border-navy bg-navy px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-wider text-paper"
          >
            <ArrowLeft className="h-3 w-3" strokeWidth={2} />
            Kembali ke tiket saya
          </Link>
        </div>
      </div>
    );
  }

  const expiresAtMs = new Date(booking.expiresAt).getTime();
  const remainingMs = expiresAtMs - now;
  const isExpired = remainingMs <= 0;
  const canPay = booking.status === "PENDING_PAYMENT" && !isExpired;
  const showExpiredNotice = booking.status === "PENDING_PAYMENT" && isExpired;
  const methodMeta = PAYMENT_METHOD_META[method];

  const rows: Array<{ label: string; value: React.ReactNode }> = [
    { label: "Lapangan", value: booking.court.name },
    {
      label: "Tanggal",
      value: formatDateIndo(new Date(booking.date)),
    },
    {
      label: "Jam main",
      value: `${formatTimeSlot({
        startTime: booking.startTime,
        endTime: booking.endTime,
      })} WIB`,
    },
    {
      label: "Pemesan",
      value: (
        <>
          {booking.userName}{" "}
          <span className="font-mono text-[12px] font-normal text-slate-muted">
            ({booking.userPhoneMasked || (booking.userPhone ? maskPhone(booking.userPhone) : "—")})
          </span>
        </>
      ),
    },
    {
      label: "Status",
      value: <StatusBadge status={booking.status} />,
    },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-8 sm:px-6">
      <div className="border-b border-navy pb-4">
        <span className="font-mono text-[12px] font-bold uppercase tracking-[0.22em] text-terracotta">
          Detail reservasi
        </span>
        <h1 className="mt-1.5 font-display text-2xl font-bold tracking-tight text-navy sm:text-3xl">
          Status &amp; Pembayaran
        </h1>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-muted sm:text-sm">
          Simpan kode booking ini. Nomor HP yang dipakai saat reservasi diperlukan untuk membuka
          pembayaran, membatalkan, dan mengunggah bukti transfer.
        </p>
      </div>

      {/* Booking summary */}
      <section className="mt-6 overflow-hidden rounded-[2px] border border-navy bg-paper">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-navy px-4 py-3.5 text-paper">
          <div className="min-w-0">
            <span className="block font-mono text-[11px] uppercase tracking-[0.22em] text-birch/70">
              Kode booking
            </span>
            <span className="mt-0.5 block truncate font-mono text-xs font-bold tracking-wide">
              {booking.id}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={async () => {
                setRefreshing(true);
                try {
                  await fetchBooking();
                  toast.success("Status reservasi diperbarui");
                } finally {
                  setRefreshing(false);
                }
              }}
              disabled={refreshing}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-[2px] border border-paper/30 px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wider text-paper transition-colors hover:border-paper disabled:opacity-50"
            >
              <Loader2
                className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : "hidden"}`}
                strokeWidth={1.5}
              />
              Muat ulang status
            </button>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard
                  .writeText(booking.id)
                  .then(() => toast.success("Kode booking disalin"))
                  .catch(() => toast.error("Gagal menyalin kode booking"));
              }}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-[2px] border border-paper/30 px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wider text-paper transition-colors hover:border-paper"
            >
              <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />
              Salin kode
            </button>
            <StatusBadge status={booking.status} />
          </div>
        </div>

        {shouldAutoRefresh ? (
          <p className="border-b border-navy/15 px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-slate-muted">
            Status diperbarui otomatis selama halaman ini terbuka.
          </p>
        ) : null}

        <dl className="divide-y divide-navy/15">
          {rows.map((row) => (
            <div key={row.label} className="flex items-baseline justify-between gap-4 px-4 py-2.5">
              <dt className="shrink-0 font-mono text-[12px] uppercase tracking-wider text-slate-muted">
                {row.label}
              </dt>
              <dd className="text-right text-sm font-semibold text-navy">{row.value}</dd>
            </div>
          ))}
        </dl>

        <div className="flex items-baseline justify-between border-t border-navy bg-birch px-4 py-3.5">
          <span className="font-mono text-[12px] font-bold uppercase tracking-wider text-navy">
            Total tagihan
          </span>
          <span className="font-mono text-xl font-bold text-terracotta">
            {formatCurrency(booking.totalPrice)}
          </span>
        </div>
      </section>

      {/* Payment window countdown */}
      {booking.status === "PENDING_PAYMENT" ? (
        <div
          aria-live="polite"
          className={`mt-4 flex flex-wrap items-center justify-between gap-2 rounded-[2px] border px-4 py-2.5 font-mono text-[12px] uppercase tracking-wider ${
            isExpired
              ? "border-terracotta bg-terracotta/10 text-terracotta"
              : "border-cobalt/40 bg-cobalt/10 text-cobalt"
          }`}
        >
          <span>{isExpired ? "Waktu pembayaran habis" : "Sisa waktu pembayaran"}</span>
          <span className="font-bold tabular-nums">{formatCountdown(remainingMs)}</span>
        </div>
      ) : null}

      {showExpiredNotice ? (
        <div className="mt-4 rounded-[2px] border border-terracotta bg-terracotta/10 px-4 py-3.5">
          <h2 className="font-mono text-[12px] font-bold uppercase tracking-wider text-terracotta">
            Slot sudah dilepas
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-terracotta">
            Batas waktu pembayaran berakhir dan slot dikembalikan ke jadwal publik. Silakan buat
            reservasi baru untuk jadwal yang Anda inginkan.
          </p>
          <Link
            href="/booking"
            className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-[2px] border border-terracotta bg-terracotta px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-wider text-paper"
          >
            Buat reservasi baru
            <ArrowRight className="h-3 w-3" strokeWidth={2} />
          </Link>
        </div>
      ) : null}

      {/* Payment panel */}
      {canPay ? (
        <section className="mt-4 rounded-[2px] border border-navy bg-paper">
          <header className="border-b border-navy bg-birch px-4 py-2.5">
            <h2 className="font-mono text-[12px] font-bold uppercase tracking-wider text-navy">
              Pilih metode pembayaran
            </h2>
          </header>

          <div className="space-y-4 p-4">
            <div>
              <label
                htmlFor="confirm-phone"
                className="mb-1 block font-mono text-[12px] font-bold uppercase tracking-wider text-navy"
              >
                Nomor HP pemesan *
              </label>
              <input
                id="confirm-phone"
                value={phone}
                onChange={(event) => {
                  setPhone(event.target.value);
                  if (phoneError) setPhoneError("");
                }}
                placeholder="08xxxxxxxxxx"
                inputMode="tel"
                autoComplete="tel"
                required
                aria-invalid={Boolean(phoneError)}
                aria-describedby={phoneError ? "confirm-phone-error" : "confirm-phone-hint"}
                className={FIELD_CLASS}
              />
              {phoneError ? (
                <p
                  id="confirm-phone-error"
                  role="alert"
                  className="mt-1 font-mono text-[11px] uppercase tracking-wide text-terracotta"
                >
                  {phoneError}
                </p>
              ) : (
                <p
                  id="confirm-phone-hint"
                  className="mt-1 font-mono text-[11px] uppercase tracking-wide text-slate-muted"
                >
                  Wajib sama dengan nomor yang dipakai saat membuat reservasi.
                </p>
              )}
            </div>

            <fieldset className="space-y-2">
              <legend className="mb-1 block font-mono text-[12px] font-bold uppercase tracking-wider text-navy">
                Metode
              </legend>
              {PAYMENT_METHOD_OPTIONS.map((option) => {
                const meta = PAYMENT_METHOD_META[option];
                const selected = method === option;
                return (
                  <label
                    key={option}
                    className={`flex cursor-pointer items-start gap-3 rounded-[2px] border p-3 transition-colors ${
                      selected
                        ? "border-navy bg-birch"
                        : "border-navy/25 bg-paper hover:border-navy/60"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment-method"
                      value={option}
                      checked={selected}
                      onChange={() => {
                        if (isPaymentMethod(option)) setMethod(option);
                      }}
                      className="mt-1 h-4 w-4 accent-cobalt"
                    />
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[12px] font-bold uppercase tracking-wider text-navy">
                          {meta.label}
                        </span>
                        {option === "QRIS" ? (
                          <span className="rounded-[2px] border border-cobalt/40 bg-cobalt/10 px-1.5 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider text-cobalt">
                            Disarankan
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block text-[12px] leading-relaxed text-slate-muted">
                        {meta.description}
                      </span>
                    </span>
                  </label>
                );
              })}
            </fieldset>

            {methodMeta.requiresMidtrans ? (
              <button
                type="button"
                onClick={handleMidtransPayment}
                disabled={paying || isExpired}
                className={BUTTON_PRIMARY}
              >
                {paying ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                    Membuka pembayaran…
                  </>
                ) : (
                  "Bayar sekarang via Midtrans (QRIS)"
                )}
              </button>
            ) : null}

            {methodMeta.requiresProof ? (
              <div className="rounded-[2px] border border-navy/20 bg-chalk p-3">
                <h3 className="font-mono text-[12px] font-bold uppercase tracking-wider text-navy">
                  Rekening tujuan transfer
                </h3>
                <dl className="mt-1.5 space-y-0.5 font-mono text-[12px] text-navy">
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-muted">Bank</dt>
                    <dd className="font-semibold">{BANK_TRANSFER_DETAILS.bank}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-muted">Nomor rekening</dt>
                    <dd className="font-semibold">{BANK_TRANSFER_DETAILS.accountNumber}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-muted">Atas nama</dt>
                    <dd className="font-semibold">{BANK_TRANSFER_DETAILS.accountName}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-muted">Nominal</dt>
                    <dd className="font-semibold">{formatCurrency(booking.totalPrice)}</dd>
                  </div>
                </dl>

                <form onSubmit={handleProofUpload} className="mt-3 space-y-2.5">
                  <label
                    htmlFor="proof-file"
                    className="block font-mono text-[12px] font-bold uppercase tracking-wider text-navy"
                  >
                    Bukti transfer (JPG/PNG/WebP, maks. 2MB)
                  </label>
                  <input
                    id="proof-file"
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    aria-label="File bukti pembayaran"
                    className="block w-full rounded-[2px] border border-dashed border-navy/35 bg-chalk px-3 py-2.5 font-mono text-[11px] uppercase tracking-wide text-slate-muted file:mr-3 file:min-h-9 file:rounded-[2px] file:border file:border-navy file:bg-navy file:px-2.5 file:py-1.5 file:font-mono file:text-[11px] file:font-bold file:uppercase file:tracking-wider file:text-paper"
                  />

                  <button type="submit" disabled={uploading || isExpired} className={BUTTON_SECONDARY}>
                    {uploading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                        Mengunggah…
                      </>
                    ) : (
                      "Unggah bukti pembayaran"
                    )}
                  </button>
                </form>
              </div>
            ) : null}

            {!methodMeta.requiresMidtrans && !methodMeta.requiresProof ? (
              <div className="space-y-3 rounded-[2px] border border-cobalt/40 bg-cobalt/10 px-3 py-3">
                <p className="font-mono text-[11px] uppercase leading-relaxed tracking-wide text-cobalt">
                  Bayar langsung ke admin saat check-in. Simpan pilihan ini agar admin dapat
                  mengonfirmasi reservasi setelah Anda membayar di arena.
                </p>
                <button
                  type="button"
                  onClick={() => void handleSelectDirect()}
                  disabled={savingMethod || isExpired || !phone.trim()}
                  className={BUTTON_SECONDARY}
                >
                  {savingMethod ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                      Menyimpan…
                    </>
                  ) : booking.payment?.method === "DIRECT" ? (
                    "Metode bayar di tempat tersimpan"
                  ) : (
                    "Simpan metode: Bayar di Tempat"
                  )}
                </button>
              </div>
            ) : null}

            {booking.payment?.midtransOrderId ? (
              <button
                type="button"
                onClick={() => syncPaymentStatus(phone)}
                disabled={syncing || !phone.trim()}
                className={BUTTON_SECONDARY}
              >
                {syncing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                    Mengecek status…
                  </>
                ) : (
                  "Cek status Midtrans"
                )}
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      {booking.status === "WAITING_VERIFICATION" ? (
        <div className="mt-4 rounded-[2px] border border-terracotta/50 bg-terracotta/10 px-4 py-3.5">
          <h2 className="font-mono text-[12px] font-bold uppercase tracking-wider text-terracotta">
            Menunggu verifikasi admin
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-terracotta">
            Bukti pembayaran sedang diperiksa. Status akan berubah otomatis setelah diverifikasi.
          </p>
        </div>
      ) : null}

      {booking.status === "CONFIRMED" ? (
        <div className="mt-4 rounded-[2px] border border-cobalt/50 bg-cobalt/10 px-4 py-3.5">
          <h2 className="font-mono text-[12px] font-bold uppercase tracking-wider text-cobalt">
            {getStatusLabel(booking.status)} — siap bermain
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-cobalt">
            Tunjukkan kode booking di meja resepsionis saat check-in. Datang 15 menit sebelum jadwal.
          </p>
        </div>
      ) : null}

      {booking.status === "CANCELLED" ? (
        <div className="mt-4 rounded-[2px] border border-navy/30 bg-birch px-4 py-3.5">
          <h2 className="font-mono text-[12px] font-bold uppercase tracking-wider text-navy">
            Reservasi dibatalkan
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-muted">
            Slot sudah dilepas kembali ke jadwal publik. Anda dapat membuat reservasi baru kapan saja.
          </p>
        </div>
      ) : null}

      {booking.payment?.rejectionReason ? (
        <div className="mt-4 rounded-[2px] border border-terracotta bg-terracotta/10 px-4 py-3.5">
          <h2 className="font-mono text-[12px] font-bold uppercase tracking-wider text-terracotta">
            Pembayaran ditolak
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-terracotta">
            {booking.payment.rejectionReason}
          </p>
        </div>
      ) : null}

      {/* Self-service cancellation */}
      {CANCELLABLE_STATUSES.includes(booking.status) ? (
        <section className="mt-4 rounded-[2px] border border-navy/25 bg-paper p-4">
          <h2 className="font-mono text-[12px] font-bold uppercase tracking-wider text-navy">
            Batalkan reservasi
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-muted">
            Pembatalan gratis paling lambat 3 jam sebelum jadwal bermain. Untuk booking yang belum
            dibayar, slot langsung dilepas setelah pembatalan.
          </p>

          {confirmingCancel ? (
            <div className="mt-3 space-y-2 rounded-[2px] border border-terracotta bg-terracotta/10 p-3">
              <p className="font-mono text-[11px] uppercase leading-relaxed tracking-wide text-terracotta">
                Yakin membatalkan reservasi ini? Tindakan ini tidak dapat diurungkan.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={cancelling}
                  className={BUTTON_DANGER}
                >
                  {cancelling ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                      Membatalkan…
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3.5 w-3.5" strokeWidth={1.5} />
                      Ya, batalkan
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingCancel(false)}
                  disabled={cancelling}
                  className={BUTTON_SECONDARY}
                >
                  Tidak jadi
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingCancel(true)}
              className={`${BUTTON_DANGER} mt-3`}
            >
              Batalkan reservasi
            </button>
          )}
        </section>
      ) : null}

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={() => router.push("/bookings")} className={BUTTON_SECONDARY}>
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
          Tiket saya
        </button>
        <button type="button" onClick={() => router.push("/booking")} className={BUTTON_PRIMARY}>
          Reservasi lagi
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
