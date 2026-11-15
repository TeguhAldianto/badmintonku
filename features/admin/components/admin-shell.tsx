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
    <div className="flex h-screen overflow-hidden bg-[#F5F3EE] text-[#141824]">
      <AdminSidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-[#141824] bg-[#FAF9F6] px-3 sm:px-5 lg:h-16 lg:px-8">
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Buka menu"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[2px] border border-[#141824]/30 bg-[#F5F3EE] text-[#141824] lg:hidden"
            >
              <Menu className="h-4 w-4" strokeWidth={1.5} />
            </button>
            <div className="min-w-0">
              <span className="block font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-[#6E6A61]">
                Administrator
              </span>
              <h2 className="truncate font-display text-sm font-bold tracking-tight sm:text-base">
                Panel Pengelola Arena
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden text-right sm:block">
              <p className="max-w-[12rem] truncate font-mono text-[11px] font-bold text-[#141824]">
                {userName || "Admin"}
              </p>
              <p className="mt-0.5 flex items-center justify-end gap-1.5 font-mono text-[9px] font-bold uppercase tracking-wider text-[#1E3A8A]">
                <span className="inline-block h-1.5 w-1.5 bg-[#1E3A8A]" />
                Sesi aktif
              </p>
            </div>

            <span className="flex h-8 w-8 items-center justify-center rounded-[2px] border border-[#141824] bg-[#141824] font-mono text-xs font-bold text-[#FAF9F6]">
              {initial}
            </span>

            <div className="h-6 w-px bg-[#141824]/20" />

            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-1.5 rounded-[2px] border border-[#141824]/30 bg-[#FAF9F6] px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[#6E6A61] transition-colors hover:border-[#C84B31] hover:text-[#C84B31]"
            >
              <LogOut className="h-3 w-3" strokeWidth={1.5} />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
