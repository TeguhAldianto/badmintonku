import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-3xl items-center px-4 py-16 sm:px-6">
      <div className="w-full rounded-[2px] border border-navy bg-paper p-6">
        <span className="font-mono text-[12px] font-bold uppercase tracking-[0.22em] text-terracotta">
          404
        </span>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-navy">
          Halaman tidak ditemukan
        </h1>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-slate-muted">
          Tautan mungkin sudah berubah atau salah ketik. Anda bisa kembali ke beranda, melihat
          jadwal lapangan, atau membuka daftar tiket yang tersimpan di perangkat ini.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Button asChild>
            <Link href="/">Ke beranda</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/booking">Cek jadwal</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/bookings">Tiket saya</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
