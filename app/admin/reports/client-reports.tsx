'use client';

import dynamic from "next/dynamic";
import { Card, CardContent } from "@/components/ui/card";

const Chart = dynamic(() => import("@/components/admin/ReportCharts"), { ssr: false });

interface ReportsData {
  totalBookings: number;
  totalRevenue: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  bookingsByCourt: Array<{ court: string; count: number; revenue: number }>;
  bookingsByStatus: Array<{ status: string; count: number }>;
  busiestHours: Array<{ hour: string; count: number }>;
}

export default function ClientReportsPage({ data }: { data: ReportsData }) {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-text">Laporan & Analitik</h1>

      <Chart />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="card-custom">
          <CardContent className="p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Total Booking</h3>
            <p className="text-3xl font-bold text-text">{data.totalBookings}</p>
          </CardContent>
        </Card>
        <Card className="card-custom">
          <CardContent className="p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Pendapatan Bulan Ini</h3>
            <p className="text-3xl font-bold text-green-600">
              Rp {Number(data.monthlyRevenue).toLocaleString("id-ID")}
            </p>
          </CardContent>
        </Card>
        <Card className="card-custom">
          <CardContent className="p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Pendapatan Tahun Ini</h3>
            <p className="text-3xl font-bold text-blue-600">
              Rp {Number(data.yearlyRevenue).toLocaleString("id-ID")}
            </p>
          </CardContent>
        </Card>
        <Card className="card-custom">
          <CardContent className="p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Total Pendapatan</h3>
            <p className="text-3xl font-bold text-text">
              Rp {Number(data.totalRevenue).toLocaleString("id-ID")}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="card-custom">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Booking per Lapangan</h3>
            <div className="space-y-3">
              {data.bookingsByCourt.map((c) => (
                <div key={c.court} className="flex justify-between items-center py-2 border-b last:border-0">
                  <span className="font-medium">{c.court}</span>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{c.count} booking</p>
                    <p className="text-xs text-gray-500">Rp {c.revenue.toLocaleString("id-ID")}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="card-custom">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Booking per Status</h3>
            <div className="space-y-3">
              {data.bookingsByStatus.map((s) => (
                <div key={s.status} className="flex justify-between items-center py-2 border-b last:border-0">
                  <span className="capitalize font-medium">{s.status.replace(/_/g, " ")}</span>
                  <span className="text-sm font-semibold text-primary">{s.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="card-custom">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Jam Tersibuk (Top 5)</h3>
            <div className="space-y-3">
              {data.busiestHours.length === 0 ? (
                <p className="text-sm text-gray-500">Belum ada data booking</p>
              ) : (
                data.busiestHours.map((h) => (
                  <div key={h.hour} className="flex justify-between items-center py-2 border-b last:border-0">
                    <span className="font-medium">{h.hour}</span>
                    <span className="text-sm font-semibold text-primary">{h.count} booking</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}