"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SlotStatus } from "@/lib/booking";

interface NearestAvailableProps {
  preferredTime: number;
  courts: Array<{
    id: number;
    name: string;
    availableSlots: number[];
  }>;
  onSelect: (courtId: number, startTime: number) => void;
  className?: string;
}

export function NearestAvailable({
  preferredTime,
  courts,
  onSelect,
  className,
}: NearestAvailableProps) {
  const suggestions: Array<{
    courtId: number;
    courtName: string;
    startTime: number;
    diff: number;
  }> = [];

  courts.forEach((court) => {
    court.availableSlots.forEach((slot) => {
      const diff = Math.abs(slot - preferredTime);
      suggestions.push({
        courtId: court.id,
        courtName: court.name,
        startTime: slot,
        diff,
      });
    });
  });

  suggestions.sort((a, b) => a.diff - b.diff);
  const topSuggestions = suggestions.slice(0, 3);

  if (topSuggestions.length === 0) return null;

  return (
    <div
      className={cn(
        "rounded-xl border border-warning/30 bg-warning/5 p-4",
        "animate-slide-up",
        className
      )}
      role="alert"
    >
      <div className="flex items-center gap-2 text-warning mb-3">
        <span className="text-lg">🔍</span>
        <h4 className="font-semibold text-text">
          Jam {preferredTime.toString().padStart(2, "0")}:00 penuh
        </h4>
      </div>
      <p className="text-sm text-muted mb-3">
        Slot terdekat yang tersedia:
      </p>
      <div className="flex flex-wrap gap-2">
        {topSuggestions.map((s, i) => (
          <Button
            key={`${s.courtId}-${s.startTime}`}
            variant="outline"
            size="sm"
            onClick={() => onSelect(s.courtId, s.startTime)}
            className={cn(
              "gap-1.5",
              i === 0 && "ring-2 ring-primary border-primary bg-primary/5"
            )}
          >
            <span className="font-mono text-xs">
              {s.startTime.toString().padStart(2, "0")}:00
            </span>
            <span className="text-xs text-muted">{s.courtName}</span>
            {i === 0 && <span className="text-xs text-primary font-medium">Terbaik</span>}
          </Button>
        ))}
      </div>
    </div>
  );
}