"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateIndo, formatDateInput } from "@/lib/booking";

export default function CourtsPage() {
  const [date, setDate] = useState<Date>(new Date());
  const router = useRouter();

  const handleNext = () => {
    router.push(`/booking?date=${formatDateInput(date)}`);
  };

  return (
    <div className="container-app py-10">
      <h1 className="text-3xl font-bold mb-8 text-center text-text">Pilih Tanggal Booking</h1>
      <div className="max-w-md mx-auto">
        <Card className="card-custom mb-6">
          <CardContent className="p-4 flex justify-center">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => d && setDate(d)}
              className="rounded-md border"
              disabled={{ before: new Date() }}
            />
          </CardContent>
        </Card>
        
        <div className="bg-primary/5 p-4 rounded-lg mb-6 border border-primary/20">
          <p className="text-center font-medium text-text">
            Anda memilih: <span className="font-bold text-primary">{formatDateIndo(date)}</span>
          </p>
        </div>

        <Button onClick={handleNext} className="w-full btn-primary text-lg py-6">
          Lanjut ke Pilih Lapangan
        </Button>
      </div>
    </div>
  );
}