"use client";

import { useState } from "react";

import {
  InteractiveFloorplan,
  type FloorplanCourt,
} from "@/features/booking/components/interactive-floorplan";

export function FloorplanShowcase({ courts }: { courts: FloorplanCourt[] }) {
  const [activeCourtId, setActiveCourtId] = useState<number | null>(courts[0]?.id ?? null);

  return (
    <InteractiveFloorplan
      courts={courts}
      activeCourtId={activeCourtId}
      onSelectCourt={setActiveCourtId}
    />
  );
}
