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

export default function BookingConfirmationPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchBooking() {
      const res = await fetch(`/api/bookings/${code}`);
      const data = await res.json();
      if (data.success) {
        setBooking(data.data);
      } else {
        toast.error(data.message);
      }
      setLoading(false);
    }
    fetchBooking();
  }, [code]);

  if (loading) return <div className="container-app py-10 text-center">Loading...</div>;
  if (!booking) return <div className="container-app py-10 text-center">Booking tidak ditemukan</div>;

  return (
    <div className="container-app py-10 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8 text-center text-text">Konfirmasi Booking</h1>
      
      <Card className="card-custom mb-6">
        <CardContent className="p-6 space-y-4">
          <div className="flex justify-between items-center border-b pb-4">
            <span className="text-gray-500">Kode Booking</span>
            <span className="font-mono font-bold text-lg">{booking.id}</span>
          </div>
          <div className="flex justify-between items-center border-b pb-4">
            <span className="text-gray-500">Status</span>
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold">
              {booking.status}
            </span>
          </div>
          <div className="flex justify-between items-center border-b pb-4">
            <span className="text-gray-500">Lapangan</span>
            <span className="font-semibold">{booking.court.name}</span>
          </div>
          <div className="flex justify-between items-center border-b pb-4">
            <span className="text-gray-500">Tanggal</span>
            <span className="font-semibold">{formatDateIndo(new Date(booking.date))}</span>
          </div>
          <div className="flex justify-between items-center border-b pb-4">
            <span className="text-gray-500">Jam Main</span>
            <span className="font-semibold">{formatTimeSlot({ startTime: booking.startTime, endTime: booking.endTime, status: "BOOKED" })}</span>
          </div>
          <div className="flex justify-between items-center border-b pb-4">
            <span className="text-gray-500">Pemesan</span>
            <span className="font-semibold">{booking.userName} ({booking.userPhone})</span>
          </div>
          <div className="flex justify-between items-center pt-2">
            <span className="text-gray-500 font-semibold">Total Harga</span>
            <span className="text-xl font-bold text-primary">Rp {Number(booking.totalPrice).toLocaleString("id-ID")}</span>
          </div>
        </CardContent>
      </Card>

      <div className="bg-primary/5 p-6 rounded-xl border border-primary/20 mb-6">
        <h3 className="font-semibold text-lg mb-2">Instruksi Pembayaran</h3>
        <p className="text-sm text-gray-600 mb-4">Silakan transfer total pembayaran ke rekening berikut:</p>
        <div className="bg-white p-4 rounded-lg border font-mono mb-4">
          BCA 1234567890 a.n. BadmintonKu
        </div>
        <p className="text-sm text-gray-500">Setelah transfer, silakan tunggu verifikasi dari admin atau hubungi WhatsApp admin.</p>
      </div>

      <Button onClick={() => router.push("/")} className="w-full btn-primary py-6">
        Kembali ke Beranda
      </Button>
    </div>
  );
}