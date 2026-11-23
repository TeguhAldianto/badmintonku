"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * Fallback for any uncaught error in the public app shell.
 * Admin has its own boundary, so this stays guest-facing.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-3xl items-center px-4 py-16 sm:px-6">
      <div className="w-full rounded-[2px] border border-navy bg-paper p-6">
        <span className="font-mono text-[12px] font-bold uppercase tracking-[0.22em] text-terracotta">
          Terjadi kendala
        </span>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-navy">
          Halaman gagal dimuat
        </h1>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-slate-muted">
          Ini biasanya koneksi yang terputus sesaat. Coba muat ulang halaman; tiket dan pembayaran
          yang sudah tersimpan tidak hilang.
        </p>
        {error.digest ? (
          <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-slate-muted">
            Kode laporan: {error.digest}
          </p>
        ) : null}
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Button onClick={reset}>Coba lagi</Button>
          <Button variant="outline" asChild>
            <Link href="/bookings">Buka tiket saya</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
