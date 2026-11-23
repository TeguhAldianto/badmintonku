"use client";

import { Button } from "@/components/ui/button";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
      <div className="mx-auto max-w-md rounded-[2px] border border-navy bg-paper p-6">
        <span className="font-mono text-[12px] font-bold uppercase tracking-[0.22em] text-terracotta">
          Terjadi kendala
        </span>
        <h2 className="mt-2 font-display text-2xl font-bold text-navy">Daftar lapangan gagal dimuat</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-muted">
          Data lapangan tidak dapat diambil dari server. Periksa koneksi Anda lalu coba lagi.
        </p>
        <Button onClick={reset} className="mt-5">
          Coba Lagi
        </Button>
      </div>
    </div>
  );
}
