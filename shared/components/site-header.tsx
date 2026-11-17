"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Menu, X, Ticket, LogOut, UserRound } from "lucide-react";

import { cn } from "@/lib/utils";
import { readLocalTickets, TICKETS_CHANGED_EVENT, TICKETS_STORAGE_KEY } from "@/features/booking/lib/ticket-store";

const NAV_LINKS = [
  { href: "/", label: "Beranda" },
  { href: "/courts", label: "Lapangan" },
  { href: "/booking", label: "Reservasi" },
  { href: "/bookings", label: "Tiket Saya" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [ticketCount, setTicketCount] = useState(0);
  const [open, setOpen] = useState(false);
  const mobileNavRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sync = () => setTicketCount(readLocalTickets().length);
    sync();

    window.addEventListener(TICKETS_CHANGED_EVENT, sync);
    window.addEventListener("storage", (event) => {
      if (event.key === TICKETS_STORAGE_KEY) sync();
    });
    return () => {
      window.removeEventListener(TICKETS_CHANGED_EVENT, sync);
    };
  }, [pathname]);

  // Drawer behaves like a real dialog: Escape closes it and focus moves inside.
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    mobileNavRef.current?.querySelector<HTMLElement>("a, button")?.focus();

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  // Panel admin dan halaman login memakai shell-nya sendiri.
  if (pathname.startsWith("/admin") || pathname === "/login") return null;

  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <header className="sticky top-0 z-40 border-b border-navy bg-chalk/95 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between gap-3 sm:h-16">
          <Link href="/" className="group flex items-center gap-3 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt">
            <span className="flex h-8 w-8 items-center justify-center rounded-[2px] border border-navy bg-navy text-paper transition-colors group-hover:border-terracotta group-hover:bg-terracotta">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 20H20" stroke="currentColor" strokeWidth="2" />
                <path
                  d="M12 17L6.5 6L10.5 8.5L12 4.5L13.5 8.5L17.5 6L12 17Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="miter"
                />
              </svg>
            </span>
            <span className="flex flex-col leading-none">
              <span className="font-display text-base font-bold tracking-tight text-navy sm:text-lg">
                OMAH GUYUB
              </span>
              <span className="mt-1 hidden font-mono text-[11px] uppercase tracking-[0.18em] text-slate-muted sm:block">
                ARENA BULUTANGKIS STANDAR BWF
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Navigasi utama">
            {NAV_LINKS.map((link) => {
              const active =
                link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "rounded-[2px] border px-3 py-2 font-mono text-[11px] font-semibold uppercase tracking-wider transition-colors",
                    active
                      ? "border-navy bg-navy text-paper"
                      : "border-transparent text-navy hover:border-navy/30 hover:bg-birch"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {status === "loading" ? (
              <span className="hidden h-9 w-24 animate-pulse rounded-[2px] bg-birch sm:block" />
            ) : session?.user ? (
              <div className="hidden items-center gap-2 lg:flex">
                <span className="flex items-center gap-2 rounded-[2px] border border-navy/25 bg-paper px-2.5 py-1.5">
                  <UserRound className="h-3.5 w-3.5 text-cobalt" strokeWidth={1.5} />
                  <span className="max-w-36 truncate font-mono text-[11px] font-semibold text-navy">
                    {session.user.name ?? "Admin"}
                  </span>
                  {isAdmin ? (
                    <span className="rounded-[2px] bg-cobalt px-1 py-0.5 font-mono text-[11px] font-bold uppercase text-paper">
                      Admin
                    </span>
                  ) : null}
                </span>
                {isAdmin ? (
                  <Link
                    href="/admin/dashboard"
                    className="rounded-[2px] border border-navy/30 bg-paper px-2.5 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-navy hover:border-navy"
                  >
                    Panel
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="flex items-center gap-1.5 rounded-[2px] border border-navy/30 bg-paper px-2.5 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-slate-muted transition-colors hover:border-terracotta hover:text-terracotta"
                >
                  <LogOut className="h-3 w-3" strokeWidth={1.5} />
                  Keluar
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="hidden rounded-[2px] border border-navy/30 bg-paper px-3 py-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-navy transition-colors hover:border-navy sm:inline-flex"
              >
                Masuk Admin
              </Link>
            )}

            <Link
              href="/bookings"
              className="inline-flex items-center gap-2 rounded-[2px] border border-navy bg-navy px-3 py-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-paper transition-colors hover:border-terracotta hover:bg-terracotta"
            >
              <Ticket className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span className="hidden whitespace-nowrap sm:inline">Tiket Saya</span>
              <span className="rounded-[2px] bg-paper px-1.5 py-0.5 font-mono text-[11px] font-bold text-navy">
                {ticketCount}
              </span>
            </Link>

            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-label={open ? "Tutup menu" : "Buka menu"}
              aria-expanded={open}
              className="flex h-11 w-11 items-center justify-center rounded-[2px] border border-navy/30 bg-paper text-navy lg:hidden"
            >
              {open ? <X className="h-4 w-4" strokeWidth={1.5} /> : <Menu className="h-4 w-4" strokeWidth={1.5} />}
            </button>
          </div>
        </div>
      </div>

      {open ? (
        <div ref={mobileNavRef} className="border-t border-navy/20 bg-paper lg:hidden">
          <nav className="mx-auto grid max-w-7xl gap-px px-4 py-3" aria-label="Navigasi seluler">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center justify-between border-b border-navy/10 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-navy last:border-0"
              >
                {link.label}
                <span aria-hidden="true">→</span>
              </Link>
            ))}
            {isAdmin ? (
              <Link
                href="/admin/dashboard"
                onClick={() => setOpen(false)}
                className="mt-2 flex min-h-11 items-center rounded-[2px] border border-cobalt bg-cobalt px-3 py-2 text-left font-mono text-[11px] font-bold uppercase tracking-wider text-paper"
              >
                Panel admin
              </Link>
            ) : null}
            {session?.user ? (
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="mt-2 flex min-h-11 items-center rounded-[2px] border border-terracotta px-3 py-2 text-left font-mono text-[11px] font-bold uppercase tracking-wider text-terracotta"
              >
                Keluar dari sesi
              </button>
            ) : (
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="mt-2 flex min-h-11 items-center rounded-[2px] border border-navy bg-navy px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-wider text-paper"
              >
                Masuk Admin
              </Link>
            )}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
