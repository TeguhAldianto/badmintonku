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
    className: "border-[#141824]/30 bg-[#FAF9F6] text-[#6E6A61]",
  },
  WAITING_VERIFICATION: {
    label: "Menunggu Verifikasi",
    className: "border-[#C84B31]/50 bg-[#C84B31]/10 text-[#C84B31]",
  },
  CONFIRMED: {
    label: "Dikonfirmasi",
    className: "border-[#1E3A8A]/50 bg-[#1E3A8A]/10 text-[#1E3A8A]",
  },
  COMPLETED: {
    label: "Selesai",
    className: "border-[#141824] bg-[#141824] text-[#FAF9F6]",
  },
  CANCELLED: {
    label: "Dibatalkan",
    className: "slot-occupied border-[#141824]/25 text-[#6E6A61] line-through",
  },
  REJECTED: {
    label: "Ditolak",
    className: "slot-occupied border-[#C84B31]/40 text-[#C84B31]",
  },
  EXPIRED: {
    label: "Kadaluarsa",
    className: "slot-occupied border-[#141824]/20 text-[#6E6A61]",
  },
  UNPAID: {
    label: "Belum Dibayar",
    className: "border-[#141824]/30 bg-[#FAF9F6] text-[#6E6A61]",
  },
  VERIFYING: {
    label: "Diverifikasi",
    className: "border-[#C84B31]/50 bg-[#C84B31]/10 text-[#C84B31]",
  },
  PAID: {
    label: "Lunas",
    className: "border-[#1E3A8A] bg-[#1E3A8A] text-[#FAF9F6]",
  },
};

export function getStatusLabel(status: string): string {
  return STATUS_MAP[status]?.label ?? status;
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const config = STATUS_MAP[status] ?? {
    label: status,
    className: "border-[#141824]/30 bg-[#FAF9F6] text-[#6E6A61]",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[2px] border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider whitespace-nowrap",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
