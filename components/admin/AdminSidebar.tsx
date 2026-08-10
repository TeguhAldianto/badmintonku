"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/admin/dashboard", icon: "📊" },
  { name: "Kalender", href: "/admin/calendar", icon: "📅" },
  { name: "Booking", href: "/admin/bookings", icon: "📝" },
  { name: "Pembayaran", href: "/admin/payments", icon: "💳" },
  { name: "Lapangan", href: "/admin/courts", icon: "🏸" },
  { name: "Jadwal", href: "/admin/schedules", icon: "🚫" },
  { name: "Laporan", href: "/admin/reports", icon: "📈" },
  { name: "Pengaturan", href: "/admin/settings", icon: "⚙️" },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={cn("bg-background-alt border-r border-border transition-all duration-300", collapsed ? "w-16" : "w-64")}>
      <div className="flex h-16 items-center justify-between px-4 border-b border-border">
        {!collapsed && (
          <Link href="/admin/dashboard" className="flex items-center gap-2 text-xl font-bold text-primary">
            <span>🏸</span>
            <span>BadmintonKu</span>
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? "→" : "←"}
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                isActive
                  ? "bg-primary text-white"
                  : "text-gray-600 hover:bg-gray-100 hover:text-text",
                collapsed && "justify-center"
              )}
            >
              <span className="text-lg">{item.icon}</span>
              {!collapsed && <span className="font-medium">{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <Link
          href="/"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-text transition-colors",
            collapsed && "justify-center"
          )}
        >
          <span>🏠</span>
          {!collapsed && <span className="font-medium">Lihat Website</span>}
        </Link>
      </div>
    </aside>
  );
}