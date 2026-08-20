"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface StickyBookingCTAProps {
  selectedCount: number;
  totalPrice: number;
  onClick: () => void;
  disabled?: boolean;
  label?: string;
  className?: string;
}

export function StickyBookingCTA({
  selectedCount,
  totalPrice,
  onClick,
  disabled = false,
  label = "Lanjutkan",
  className,
}: StickyBookingCTAProps) {
  if (selectedCount === 0) return null;

  const duration = selectedCount;
  const hours = duration === 1 ? "1 jam" : `${duration} jam`;

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50",
        "bg-white border-t border-border shadow-xl",
        "px-4 py-3 safe-area-bottom",
        "md:hidden",
        className
      )}
      role="region"
      aria-label="Ringkasan booking"
    >
      <div className="max-w-xl mx-auto flex items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">Total</span>
            <span className="font-semibold text-text">
              Rp {totalPrice.toLocaleString("id-ID")}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-muted mt-0.5">
            <span>{duration} slot • {hours}</span>
            <span className="font-medium text-primary">{selectedCount} dipilih</span>
          </div>
        </div>
        <Button
          onClick={onClick}
          disabled={disabled}
          className="w-[140px] h-12 text-base font-semibold flex-shrink-0"
          size="lg"
        >
          {label}
        </Button>
      </div>
    </div>
  );
}