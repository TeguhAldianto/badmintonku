"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { LogOut, Menu } from "lucide-react";

import { AdminSidebar } from "@/features/admin/components/AdminSidebar";

interface AdminShellProps {
  userName: string;
  userEmail: string;
  children: React.ReactNode;
}

export function AdminShell({ userName, userEmail, children }: AdminShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const initial = (userName || userEmail || "A").trim().charAt(0).toUpperCase();

  return (
    <div className="flex h-dvh overflow-hidden bg-chalk text-navy">
      <AdminSidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-navy bg-paper px-3 sm:px-5 lg:h-16 lg:px-8">
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Buka menu"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[2px] border border-navy/30 bg-chalk text-navy lg:hidden"
            >
              <Menu className="h-4 w-4" strokeWidth={1.5} />
            </button>
            <div className="min-w-0">
              <span className="block font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-slate-muted">
                Administrator
              </span>
              <h2 className="truncate font-display text-sm font-bold tracking-tight sm:text-base">
                Panel Pengelola Arena
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden text-right sm:block">
              <p className="max-w-[12rem] truncate font-mono text-[11px] font-bold text-navy">
                {userName || "Admin"}
              </p>
              <p className="mt-0.5 flex items-center justify-end gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-cobalt">
                <span className="inline-block h-1.5 w-1.5 bg-cobalt" />
                Sesi aktif
              </p>
            </div>

            <span className="flex h-8 w-8 items-center justify-center rounded-[2px] border border-navy bg-navy font-mono text-xs font-bold text-paper">
              {initial}
            </span>

            <div className="h-6 w-px bg-navy/20" />

            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-1.5 rounded-[2px] border border-navy/30 bg-paper px-2.5 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-slate-muted transition-colors hover:border-terracotta hover:text-terracotta"
            >
              <LogOut className="h-3 w-3" strokeWidth={1.5} />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</div>
      </div>
    </div>
  );
}
