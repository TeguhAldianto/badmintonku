import { cn } from "@/lib/utils";

/**
 * Palet status arsitektural — tanpa warna hijau.
 * Cobalt (#1E3A8A) = lunas / terkonfirmasi / tersedia.
 * Terracotta (#C84B31) = menunggu / peringatan.
 * Navy (#141824) = selesai / netral kuat.
 * Arsir diagonal = batal / kedaluwarsa.
 */
const STATUS_MAP: Record<string, { label: string; className: string }> = {
  PENDING_PAYMENT: {
    label: "Menunggu Pembayaran",
    className: "border-navy/30 bg-paper text-slate-muted",
  },
  WAITING_VERIFICATION: {
    label: "Menunggu Verifikasi",
    className: "border-terracotta/50 bg-terracotta/10 text-terracotta",
  },
  CONFIRMED: {
    label: "Dikonfirmasi",
    className: "border-cobalt/50 bg-cobalt/10 text-cobalt",
  },
  COMPLETED: {
    label: "Selesai",
    className: "border-navy bg-navy text-paper",
  },
  CANCELLED: {
    label: "Dibatalkan",
    className: "slot-occupied border-navy/25 text-slate-muted line-through",
  },
  REJECTED: {
    label: "Ditolak",
    className: "slot-occupied border-terracotta/40 text-terracotta",
  },
  EXPIRED: {
    label: "Kadaluarsa",
    className: "slot-occupied border-navy/20 text-slate-muted",
  },
  UNPAID: {
    label: "Belum Dibayar",
    className: "border-navy/30 bg-paper text-slate-muted",
  },
  VERIFYING: {
    label: "Diverifikasi",
    className: "border-terracotta/50 bg-terracotta/10 text-terracotta",
  },
  PAID: {
    label: "Lunas",
    className: "border-cobalt bg-cobalt text-paper",
  },
};

export function getStatusLabel(status: string): string {
  return STATUS_MAP[status]?.label ?? status;
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const config = STATUS_MAP[status] ?? {
    label: status,
    className: "border-navy/30 bg-paper text-slate-muted",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[2px] border px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider whitespace-nowrap",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
