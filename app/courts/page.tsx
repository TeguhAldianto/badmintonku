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
    <div className="container-app py-12 px-4 max-w-4xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-extrabold text-text mb-3">Pilih Tanggal</h1>
        <p className="text-muted-foreground">Pilih jadwal main Anda untuk melihat ketersediaan lapangan.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 items-start">
        <Card className="card-custom border-0 shadow-xl shadow-black/5 p-2">
          <CardContent className="p-0">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => d && setDate(d)}
              className="w-full"
              disabled={{ before: new Date() }}
            />
          </CardContent>
        </Card>
        
        <div className="space-y-6">
          <div className="bg-primary/10 border border-primary/20 rounded-2xl p-6 text-center">
            <p className="text-sm font-medium text-primary mb-1 uppercase tracking-wider">Tanggal Terpilih</p>
            <p className="text-2xl font-bold text-text">{formatDateIndo(date)}</p>
          </div>

          <Button 
            onClick={handleNext} 
            className="w-full btn-primary text-base h-14 rounded-xl shadow-lg shadow-primary/30 hover:scale-[1.02] transition-transform"
          >
            Lihat Ketersediaan Lapangan
          </Button>
        </div>
      </div>
    </div>
  );
}