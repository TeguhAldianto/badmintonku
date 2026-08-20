"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { formatTimeSlot, formatDateIndo } from "@/lib/booking";

interface BookingData {
  id: string;
  status: string;
  court: { name: string };
  date: string;
  startTime: number;
  endTime: number;
  userName: string;
  userPhone: string;
  totalPrice: number;
}

export default function BookingConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function fetchBooking() {
      const res = await fetch(`/api/bookings/${id}`);
      const data = await res.json();
      if (data.success) {
        setBooking(data.data);
      } else {
        toast.error(data.message);
      }
      setLoading(false);
    }
    fetchBooking();
  }, [id]);

  const handleMidtransPayment = async () => {
    if (!booking) return;
    
    setPaying(true);
    
    try {
      // Create Midtrans Snap token
      const res = await fetch("/api/payments/midtrans/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingCode: booking.id }),
      });
      
      const data = await res.json();
      
      if (!data.success) {
        toast.error(data.message || "Gagal membuat token pembayaran");
        setPaying(false);
        return;
      }

      const { token, redirectUrl } = data.data;
      
      // Open Midtrans Snap
      if (typeof window !== "undefined" && (window as unknown as { snap: { pay: (token: string, options: unknown) => void } }).snap) {
        (window as unknown as { snap: { pay: (token: string, options: unknown) => void } }).snap.pay(token, {
          onSuccess: async (result: unknown) => {
            console.log("Payment success:", result);
            toast.success("Pembayaran berhasil! Menunggu verifikasi...");
            // Refresh booking status
            await fetchBooking();
          },
          onPending: async (result: unknown) => {
            console.log("Payment pending:", result);
            toast.loading("Pembayaran pending, menunggu verifikasi...");
            await fetchBooking();
          },
          onError: (result: unknown) => {
            console.error("Payment error:", result);
            toast.error("Pembayaran gagal: " + (result && typeof result === "object" && "status_message" in result 
              ? String(result.status_message) 
              : "Unknown error"));
          },
          onClose: () => {
            console.log("Payment popup closed");
            setPaying(false);
          },
        });
      } else {
        // Fallback: redirect to Midtrans page
        window.location.assign(redirectUrl);
      }
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Gagal memproses pembayaran");
      setPaying(false);
    }
  };

  const fetchBooking = async () => {
    if (!booking) return;
    const res = await fetch(`/api/bookings/${booking.id}`);
    const data = await res.json();
    if (data.success) {
      setBooking(data.data);
    }
  };

  if (loading) return <div className="container-app py-10 text-center">Loading...</div>;
  if (!booking) return <div className="container-app py-10 text-center">Booking tidak ditemukan</div>;

  const canPay = booking.status === "PENDING_PAYMENT";

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return <span className="px-3 py-1 bg-green-100 text-green-800 border border-green-200 rounded-full text-xs font-bold tracking-wide uppercase">Dikonfirmasi</span>;
      case "PENDING_PAYMENT":
        return <span className="px-3 py-1 bg-amber-100 text-amber-800 border border-amber-200 rounded-full text-xs font-bold tracking-wide uppercase">Menunggu Pembayaran</span>;
      case "WAITING_VERIFICATION":
        return <span className="px-3 py-1 bg-blue-100 text-blue-800 border border-blue-200 rounded-full text-xs font-bold tracking-wide uppercase">Verifikasi Pembayaran</span>;
      case "CANCELLED":
      case "REJECTED":
      case "EXPIRED":
        return <span className="px-3 py-1 bg-red-100 text-red-800 border border-red-200 rounded-full text-xs font-bold tracking-wide uppercase">{status}</span>;
      default:
        return <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-bold">{status}</span>;
    }
  };

  return (
    <div className="container-app py-10 max-w-2xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold text-text tracking-tight">Detail Booking</h1>
        <p className="text-sm text-gray-500 mt-1">Simpan kode booking Anda untuk mengecek status pesanan</p>
      </div>
      
      <Card className="card-custom mb-6 overflow-hidden border border-border shadow-sm">
        <CardContent className="p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-border/60 pb-4">
            <span className="text-sm font-medium text-gray-500">Kode Booking</span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-lg text-primary">{booking.id}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(booking.id);
                  toast.success("Kode booking berhasil disalin!");
                }}
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded transition-colors"
                title="Salin Kode"
              >
                Salin
              </button>
            </div>
          </div>
          <div className="flex justify-between items-center border-b border-border/60 pb-4">
            <span className="text-sm font-medium text-gray-500">Status</span>
            {getStatusBadge(booking.status)}
          </div>
          <div className="flex justify-between items-center border-b border-border/60 pb-4">
            <span className="text-sm font-medium text-gray-500">Lapangan</span>
            <span className="font-semibold text-text">{booking.court.name}</span>
          </div>
          <div className="flex justify-between items-center border-b border-border/60 pb-4">
            <span className="text-sm font-medium text-gray-500">Tanggal</span>
            <span className="font-semibold text-text">{formatDateIndo(new Date(booking.date))}</span>
          </div>
          <div className="flex justify-between items-center border-b border-border/60 pb-4">
            <span className="text-sm font-medium text-gray-500">Jam Main</span>
            <span className="font-semibold text-text">{formatTimeSlot({ startTime: booking.startTime, endTime: booking.endTime, status: "BOOKED" })}</span>
          </div>
          <div className="flex justify-between items-center border-b border-border/60 pb-4">
            <span className="text-sm font-medium text-gray-500">Pemesan</span>
            <span className="font-semibold text-text">{booking.userName} <span className="text-gray-400 font-normal">({booking.userPhone})</span></span>
          </div>
          <div className="flex justify-between items-center pt-2">
            <span className="text-base font-bold text-text">Total Biaya</span>
            <span className="text-2xl font-black text-primary">Rp {Number(booking.totalPrice).toLocaleString("id-ID")}</span>
          </div>
        </CardContent>
      </Card>

      {canPay && (
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 rounded-2xl border border-primary/20 mb-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">💳</span>
            <h3 className="font-bold text-lg text-text">Pembayaran Instan (Midtrans)</h3>
          </div>
          <p className="text-sm text-gray-600 mb-5 leading-relaxed">
            Mendukung QRIS (Gopay/OVO/Dana/ShopeePay), Virtual Account (BCA, Mandiri, BRI, BNI), dan Kartu Kredit/Debit.
          </p>
          <Button 
            onClick={handleMidtransPayment} 
            disabled={paying}
            className="w-full btn-primary py-6 text-base font-bold rounded-xl shadow-md hover:shadow-lg transition-all"
          >
            {paying ? "Membuka Pembayaran..." : "Bayar Sekarang via Midtrans"}
          </Button>
        </div>
      )}

      {!canPay && booking.status !== "CONFIRMED" && (
        <div className="bg-gray-50 p-6 rounded-2xl border border-border mb-6">
          <h3 className="font-bold text-base text-text mb-2 flex items-center gap-2">
            <span>🏛️</span> Transfer Bank Manual
          </h3>
          <p className="text-sm text-gray-600 mb-3">Silakan lakukan transfer ke rekening resmi berikut:</p>
          <div className="bg-white p-4 rounded-xl border border-border flex items-center justify-between font-mono mb-3">
            <div>
              <p className="text-xs text-gray-400 font-sans">Bank BCA</p>
              <p className="font-bold text-gray-800 text-base">1234567890</p>
              <p className="text-xs text-gray-500 font-sans">a.n. BadmintonKu</p>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText("1234567890");
                toast.success("Nomor rekening disalin!");
              }}
              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg font-sans font-medium transition-colors"
            >
              Salin Rekening
            </button>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">
            Konfirmasi otomatis via WhatsApp akan dikirimkan begitu pembayaran berhasil diverifikasi oleh sistem.
          </p>
        </div>
      )}

      <div className="flex gap-4">
        <Button onClick={() => router.push("/")} variant="outline" className="w-full py-6 text-base font-medium rounded-xl border-border">
          Kembali ke Beranda
        </Button>
        <Button onClick={() => router.push("/booking")} className="w-full btn-primary py-6 text-base font-bold rounded-xl">
          Booking Lainnya
        </Button>
      </div>
    </div>
  );
}