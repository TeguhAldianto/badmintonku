"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  CalendarDays,
  ClipboardList,
  Clock,
  CreditCard,
  LayoutDashboard,
  Settings,
  X,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
  code: string;
}

const navigation: NavigationItem[] = [
  { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard, code: "01" },
  { name: "Kalender", href: "/admin/calendar", icon: CalendarDays, code: "02" },
  { name: "Booking", href: "/admin/bookings", icon: ClipboardList, code: "03" },
  { name: "Pembayaran", href: "/admin/payments", icon: CreditCard, code: "04" },
  { name: "Lapangan", href: "/admin/courts", icon: Building2, code: "05" },
  { name: "Jadwal", href: "/admin/schedules", icon: Clock, code: "06" },
  { name: "Laporan", href: "/admin/reports", icon: BarChart3, code: "07" },
  { name: "Pengaturan", href: "/admin/settings", icon: Settings, code: "08" },
];

interface AdminSidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function AdminSidebar({ mobileOpen, onCloseMobile }: AdminSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Tutup menu"
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-[#141824]/60 lg:hidden"
        />
      ) : null}

      <aside
        className={cn(
          "z-50 flex shrink-0 flex-col border-r border-[#141824] bg-[#141824] text-[#FAF9F6] transition-all duration-200",
          "fixed inset-y-0 left-0 w-64 lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          collapsed ? "lg:w-[72px]" : "lg:w-60"
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-[#FAF9F6]/15 px-3 lg:h-16">
          <Link href="/admin/dashboard" className="flex items-center gap-2.5 overflow-hidden">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[2px] border border-[#FAF9F6]/40">
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
            <span
              className={cn(
                "flex flex-col leading-none transition-opacity",
                collapsed && "lg:hidden"
              )}
            >
              <span className="font-display text-sm font-bold tracking-tight">OMAH GUYUB</span>
              <span className="mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-[#EAE6DD]/50">
                Panel pengelola
              </span>
            </span>
          </Link>

          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Tutup menu"
            className="flex h-7 w-7 items-center justify-center rounded-[2px] border border-[#FAF9F6]/25 text-[#FAF9F6] lg:hidden"
          >
            <X className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>

          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? "Lebarkan menu" : "Ringkas menu"}
            className="hidden h-7 w-7 items-center justify-center rounded-[2px] border border-[#FAF9F6]/25 font-mono text-[10px] font-bold text-[#FAF9F6] transition-colors hover:border-[#C84B31] hover:bg-[#C84B31] lg:flex"
          >
            {collapsed ? "»" : "«"}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-2" aria-label="Menu admin">
          <p
            className={cn(
              "px-4 pb-2 pt-2 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-[#EAE6DD]/40",
              collapsed && "lg:hidden"
            )}
          >
            Menu utama
          </p>

          <ul className="space-y-px">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    title={collapsed ? item.name : undefined}
                    onClick={onCloseMobile}
                    className={cn(
                      "flex items-center gap-2.5 border-l-2 px-3 py-2.5 transition-colors",
                      isActive
                        ? "border-[#C84B31] bg-[#FAF9F6]/10 text-[#FAF9F6]"
                        : "border-transparent text-[#EAE6DD]/65 hover:border-[#FAF9F6]/30 hover:bg-[#FAF9F6]/5 hover:text-[#FAF9F6]",
                      collapsed && "lg:justify-center lg:px-2"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                    <span
                      className={cn(
                        "flex-1 truncate font-mono text-[11px] font-semibold uppercase tracking-wider",
                        collapsed && "lg:hidden"
                      )}
                    >
                      {item.name}
                    </span>
                    <span
                      className={cn(
                        "font-mono text-[9px] text-[#EAE6DD]/30",
                        collapsed && "lg:hidden"
                      )}
                    >
                      {item.code}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-[#FAF9F6]/15 p-2">
          <Link
            href="/"
            onClick={onCloseMobile}
            title={collapsed ? "Ke situs utama" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-[2px] border border-[#FAF9F6]/20 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-[#EAE6DD]/70 transition-colors hover:border-[#C84B31] hover:bg-[#C84B31] hover:text-[#FAF9F6]",
              collapsed && "lg:justify-center lg:px-2"
            )}
          >
            <span className="text-xs">↗</span>
            <span className={cn(collapsed && "lg:hidden")}>Ke situs utama</span>
          </Link>
        </div>
      </aside>
    </>
  );
}
