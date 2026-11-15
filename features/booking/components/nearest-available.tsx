"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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
        "rounded-[2px] border border-[#C84B31]/40 bg-[#C84B31]/10 p-4",
        "animate-panel",
        className
      )}
      role="alert"
    >
      <div className="mb-3 flex items-center gap-2 text-[#C84B31]">
        <span className="font-mono text-xs font-bold uppercase tracking-wider">[!]</span>
        <h4 className="font-mono text-[11px] font-bold uppercase tracking-wider">
          Jam {preferredTime.toString().padStart(2, "0")}:00 penuh
        </h4>
      </div>
      <p className="mb-3 text-xs text-[#6E6A61]">Slot terdekat yang tersedia:</p>
      <div className="flex flex-wrap gap-2">
        {topSuggestions.map((s, i) => (
          <Button
            key={`${s.courtId}-${s.startTime}`}
            variant="outline"
            size="sm"
            onClick={() => onSelect(s.courtId, s.startTime)}
            className={cn("gap-1.5", i === 0 && "border-[#141824] bg-[#EAE6DD]")}
          >
            <span className="font-mono text-xs tabular-nums">
              {s.startTime.toString().padStart(2, "0")}:00
            </span>
            <span className="text-[10px] uppercase text-[#6E6A61]">{s.courtName}</span>
            {i === 0 && (
              <span className="font-mono text-[9px] font-bold uppercase text-[#C84B31]">
                Terbaik
              </span>
            )}
          </Button>
        ))}
      </div>
    </div>
  );
}