"use client";

import { useCallback, useEffect, useRef, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Copy, Loader2 } from "lucide-react";

import { StatusBadge } from "@/shared/components/status-badge";
import { formatCurrency, formatDateIndo, formatTimeSlot, maskPhone } from "@/shared/lib/format";
import {
  isPaymentMethod,
  PAYMENT_INSTRUCTIONS,
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

const PAYMENT_METHOD_OPTIONS: Array<{ value: PaymentMethod; label: string }> = [
  { value: "BANK_TRANSFER", label: "Transfer Bank" },
  { value: "QRIS", label: "QRIS" },
  { value: "DIRECT", label: "Bayar di Tempat" },
];

const FIELD_CLASS =
  "w-full rounded-[2px] border border-[#141824]/30 bg-[#F5F3EE] px-3 py-2.5 text-sm text-[#141824] outline-none transition-colors placeholder:text-[#6E6A61]/70 focus:border-[#141824] disabled:cursor-not-allowed disabled:opacity-50";

const BUTTON_PRIMARY =
  "flex w-full items-center justify-center gap-2 rounded-[2px] border border-[#141824] bg-[#C84B31] px-4 py-3.5 font-mono text-xs font-bold uppercase tracking-wider text-[#FAF9F6] transition-colors hover:bg-[#141824] disabled:cursor-not-allowed disabled:opacity-45";

const BUTTON_SECONDARY =
  "flex w-full items-center justify-center gap-2 rounded-[2px] border border-[#141824]/30 bg-[#FAF9F6] px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-wider text-[#141824] transition-colors hover:border-[#141824] hover:bg-[#EAE6DD] disabled:cursor-not-allowed disabled:opacity-45";

export default function BookingConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [phone, setPhone] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("BANK_TRANSFER");
  // Captured once at mount so render stays pure (Date.now() must not run during render).
  const [mountedAt] = useState(() => Date.now());

  const fetchBooking = useCallback(async () => {
    try {
      const res = await fetch(`/api/bookings/${id}`);
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
    if (!phone.trim()) {
      toast.error("Masukkan nomor HP yang dipakai saat booking");
      return;
    }

    setPaying(true);

    try {
      const res = await fetch("/api/payments/midtrans/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingCode: booking.id, userPhone: phone }),
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
            await syncPaymentStatus(phone);
          },
          onPending: async () => {
            toast("Pembayaran pending, menunggu verifikasi...");
            await syncPaymentStatus(phone);
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

  const handleProofUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!booking) return;

    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast.error("Pilih file bukti pembayaran");
      return;
    }
    if (!phone.trim()) {
      toast.error("Masukkan nomor HP yang dipakai saat booking");
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("method", method);
      formData.append("userPhone", phone);

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

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-[#6E6A61]">
          <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
          Memuat detail reservasi…
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="rounded-[2px] border border-[#141824] bg-[#FAF9F6] p-6">
          <h1 className="font-display text-xl font-bold text-[#141824]">
            Reservasi tidak ditemukan
          </h1>
          <p className="mt-1.5 text-sm text-[#6E6A61]">
            Kode booking tidak cocok dengan data arena. Periksa kembali tautan tiket Anda.
          </p>
          <Link
            href="/bookings"
            className="mt-4 inline-flex items-center gap-2 rounded-[2px] border border-[#141824] bg-[#141824] px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-[#FAF9F6]"
          >
            <ArrowLeft className="h-3 w-3" strokeWidth={2} />
            Kembali ke tiket saya
          </Link>
        </div>
      </div>
    );
  }

  const canPay = booking.status === "PENDING_PAYMENT";
  const isExpired = new Date(booking.expiresAt).getTime() < mountedAt;

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
          <span className="font-mono text-[11px] font-normal text-[#6E6A61]">
            ({booking.userPhoneMasked || (booking.userPhone ? maskPhone(booking.userPhone) : "—")})
          </span>
        </>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-8 sm:px-6">
      <div className="border-b border-[#141824] pb-4">
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#C84B31]">
          Detail reservasi / Lembar 03
        </span>
        <h1 className="mt-1.5 font-display text-2xl font-bold tracking-tight text-[#141824] sm:text-3xl">
          Status &amp; Pembayaran
        </h1>
        <p className="mt-1.5 text-xs leading-relaxed text-[#6E6A61] sm:text-sm">
          Simpan kode booking ini. Nomor HP yang dipakai saat reservasi diperlukan untuk membuka
          pembayaran dan mengunggah bukti transfer.
        </p>
      </div>

      {/* Booking summary */}
      <section className="mt-6 overflow-hidden rounded-[2px] border border-[#141824] bg-[#FAF9F6]">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#141824] px-4 py-3.5 text-[#FAF9F6]">
          <div className="min-w-0">
            <span className="block font-mono text-[9px] uppercase tracking-[0.22em] text-[#EAE6DD]/60">
              Kode booking
            </span>
            <span className="mt-0.5 block truncate font-mono text-xs font-bold tracking-wide">
              {booking.id}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(booking.id);
                toast.success("Kode booking disalin");
              }}
              className="inline-flex items-center gap-1.5 rounded-[2px] border border-[#FAF9F6]/30 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-[#FAF9F6] transition-colors hover:border-[#FAF9F6]"
            >
              <Copy className="h-3 w-3" strokeWidth={1.5} />
              Salin
            </button>
            <StatusBadge status={booking.status} />
          </div>
        </div>

        <dl className="divide-y divide-[#141824]/15">
          {rows.map((row) => (
            <div key={row.label} className="flex items-baseline justify-between gap-4 px-4 py-2.5">
              <dt className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-[#6E6A61]">
                {row.label}
              </dt>
              <dd className="text-right text-sm font-semibold text-[#141824]">{row.value}</dd>
            </div>
          ))}
        </dl>

        <div className="flex items-baseline justify-between border-t border-[#141824] bg-[#EAE6DD] px-4 py-3.5">
          <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#141824]">
            Total tagihan
          </span>
          <span className="font-mono text-xl font-bold text-[#C84B31]">
            {formatCurrency(booking.totalPrice)}
          </span>
        </div>
      </section>

      {/* Payment panel */}
      {canPay ? (
        <section className="mt-4 rounded-[2px] border border-[#141824] bg-[#FAF9F6]">
          <header className="border-b border-[#141824] bg-[#EAE6DD] px-4 py-2.5">
            <h2 className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#141824]">
              Konfirmasi &amp; metode pembayaran
            </h2>
          </header>

          <div className="space-y-4 p-4">
            <div>
              <label
                htmlFor="confirm-phone"
                className="mb-1 block font-mono text-[11px] font-bold uppercase tracking-wider text-[#141824]"
              >
                Nomor HP pemesan *
              </label>
              <input
                id="confirm-phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="08xxxxxxxxxx"
                inputMode="tel"
                className={FIELD_CLASS}
              />
              <p className="mt-1 font-mono text-[10px] uppercase tracking-wide text-[#6E6A61]">
                Wajib sama dengan nomor yang dipakai saat membuat reservasi.
              </p>
            </div>

            {isExpired ? (
              <p className="rounded-[2px] border border-[#C84B31]/50 bg-[#C84B31]/10 px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-[#C84B31]">
                Waktu pembayaran habis. Silakan buat reservasi baru.
              </p>
            ) : null}

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
                "Bayar sekarang via Midtrans"
              )}
            </button>

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

            <div className="border-t border-[#141824]/20 pt-4">
              <h3 className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#141824]">
                Unggah bukti transfer manual
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-[#6E6A61]">
                Transfer ke BCA 1234567890 a.n. BadmintonKu, lalu unggah bukti di bawah ini.
              </p>

              <form onSubmit={handleProofUpload} className="mt-3 space-y-2.5">
                <label htmlFor="payment-method" className="sr-only">
                  Metode pembayaran
                </label>
                <select
                  id="payment-method"
                  value={method}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (isPaymentMethod(value)) setMethod(value);
                  }}
                  className={FIELD_CLASS}
                >
                  {PAYMENT_METHOD_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <p className="font-mono text-[10px] uppercase leading-relaxed tracking-wide text-[#6E6A61]">
                  {PAYMENT_INSTRUCTIONS[method]}
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  aria-label="File bukti pembayaran"
                  className="block w-full rounded-[2px] border border-dashed border-[#141824]/35 bg-[#F5F3EE] px-3 py-2.5 font-mono text-[10px] uppercase tracking-wide text-[#6E6A61] file:mr-3 file:rounded-[2px] file:border file:border-[#141824] file:bg-[#141824] file:px-2.5 file:py-1.5 file:font-mono file:text-[10px] file:font-bold file:uppercase file:tracking-wider file:text-[#FAF9F6]"
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
          </div>
        </section>
      ) : null}

      {booking.status === "WAITING_VERIFICATION" ? (
        <div className="mt-4 rounded-[2px] border border-[#C84B31]/50 bg-[#C84B31]/10 px-4 py-3.5">
          <h3 className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#C84B31]">
            Menunggu verifikasi admin
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-[#C84B31]/90">
            Bukti pembayaran sedang diperiksa. Status akan berubah otomatis setelah diverifikasi.
          </p>
        </div>
      ) : null}

      {booking.payment?.rejectionReason ? (
        <div className="mt-4 rounded-[2px] border border-[#C84B31] bg-[#C84B31]/10 px-4 py-3.5">
          <h3 className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#C84B31]">
            Pembayaran ditolak
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-[#C84B31]/90">
            {booking.payment.rejectionReason}
          </p>
        </div>
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
