"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const WHATSAPP_NUMBER = "6281234567890";
const WHATSAPP_DISPLAY = "+62 812-3456-7890";
const MAPS_URL =
  "https://www.google.com/maps/search/?api=1&query=Omah+Guyub+Arena+Bulutangkis";

export function SiteFooter() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin") || pathname === "/login") return null;

  return (
    <footer className="mt-auto border-t border-navy bg-chalk">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <p className="font-display text-base font-bold tracking-tight text-navy">
              OMAH GUYUB — ARENA BULUTANGKIS
            </p>
            <p className="mt-2 max-w-md text-xs leading-relaxed text-slate-muted">
              Tiga lapangan indoor standar BWF dengan plafon bebas 14 meter, pencahayaan samping
              anti-silau 800 lux, dan sub-lantai pegas untuk meredam benturan sendi.
            </p>
            <address className="mt-3 not-italic">
              <p className="text-xs leading-relaxed text-navy">
                Jl. Guyub Rukun No. 12, Kel. Sukamaju, Kec. Cilandak, Jakarta Selatan 12430
              </p>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] uppercase tracking-wider">
                <a
                  className="text-navy underline decoration-navy/30 underline-offset-2 hover:decoration-navy"
                  href={`https://wa.me/${WHATSAPP_NUMBER}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  WhatsApp {WHATSAPP_DISPLAY}
                </a>
                <a
                  className="text-navy underline decoration-navy/30 underline-offset-2 hover:decoration-navy"
                  href={MAPS_URL}
                  target="_blank"
                  rel="noreferrer"
                >
                  Lihat peta
                </a>
              </p>
            </address>
          </div>
          <div>
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-slate-muted">
              Navigasi
            </p>
            <ul className="mt-3 space-y-2 font-mono text-[11px] uppercase tracking-wider text-navy">
              <li><Link className="hover:text-terracotta" href="/courts">Lapangan</Link></li>
              <li><Link className="hover:text-terracotta" href="/booking">Reservasi</Link></li>
              <li><Link className="hover:text-terracotta" href="/bookings">Tiket Saya</Link></li>
              <li><Link className="hover:text-terracotta" href="/dashboard">Ringkasan</Link></li>
              <li><Link className="hover:text-terracotta" href="/login">Masuk Admin</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-slate-muted">
              Operasional
            </p>
            <ul className="mt-3 space-y-2 font-mono text-[11px] uppercase tracking-wider text-navy">
              <li>Senin — Minggu</li>
              <li>08:00 — 21:00 WIB</li>
              <li className="flex items-center gap-2 text-slate-muted">
                <span aria-hidden="true" className="inline-block h-2 w-2 bg-cobalt" />
                Pembayaran Midtrans
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-navy/20 pt-4">
          <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-slate-muted">
            Kebijakan pembatalan &amp; refund
          </h2>
          <p className="mt-1.5 max-w-3xl text-xs leading-relaxed text-slate-muted">
            Pembatalan mandiri dapat dilakukan paling lambat 3 jam sebelum jadwal bermain. Booking
            yang dibatalkan sebelum batas waktu tersebut akan dilepas kembali ke jadwal publik.
            Refund untuk pembayaran Midtrans diproses manual oleh pengelola maksimal 3 hari kerja
            setelah permintaan disetujui. Hubungi WhatsApp arena untuk pengajuan refund atau
            penjadwalan ulang.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-2 border-t border-navy/20 pt-4 font-mono text-[11px] uppercase tracking-wider text-slate-muted sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 OMAH GUYUB</span>
          <span>Standar Peralatan BWF · Verifikasi Bukti Transfer</span>
        </div>
      </div>
    </footer>
  );
}
