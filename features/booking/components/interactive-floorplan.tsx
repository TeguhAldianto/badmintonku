"use client";

import { cn } from "@/lib/utils";
import { formatCurrency } from "@/shared/lib/format";

export interface FloorplanCourt {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  pricePerHour: number;
}

const COURT_STYLES = [
  { code: "01 · COBALT", accent: "#1E3A8A" },
  { code: "02 · TERRACOTTA", accent: "#C84B31" },
  { code: "03 · VIP PRIVATE", accent: "#141824" },
];

const SLOTS = [
  { zoneX: 56, zoneW: 194, matX: 85, matW: 136, half: 153 },
  { zoneX: 272, zoneW: 194, matX: 301, matW: 136, half: 369 },
  { zoneX: 488, zoneW: 216, matX: 506, matW: 136, half: 574 },
];

interface InteractiveFloorplanProps {
  courts: FloorplanCourt[];
  activeCourtId: number | null;
  onSelectCourt: (courtId: number) => void;
}

export function InteractiveFloorplan({ courts, activeCourtId, onSelectCourt }: InteractiveFloorplanProps) {
  const activeCourt = courts.find((court) => court.id === activeCourtId) ?? courts[0] ?? null;
  const activeIndex = activeCourt ? courts.findIndex((court) => court.id === activeCourt.id) : 0;
  const activeStyle = COURT_STYLES[Math.max(0, activeIndex) % COURT_STYLES.length];

  if (courts.length === 0) {
    return (
      <div className="rounded-[2px] border border-[#141824] bg-[#FAF9F6] p-6">
        <p className="font-mono text-xs uppercase tracking-wider text-[#6E6A61]">
          Memuat denah lapangan…
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[2px] border border-[#141824] bg-[#FAF9F6]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#141824] bg-[#EAE6DD] px-4 py-2.5 font-mono text-[11px]">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#141824]">DENAH LANTAI UTAMA (SKALA 1:100)</span>
          <span className="hidden text-[#6E6A61] sm:inline">— KLIK LAPANGAN UNTUK FILTER</span>
        </div>
        <span className="text-[#6E6A61]">DIMENSI HALL: 32.4M × 17.4M</span>
      </div>

      <div className="architectural-grid p-3 sm:p-5">
        <svg
          className="h-auto w-full select-none"
          viewBox="0 0 760 370"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          role="group"
          aria-label="Denah interaktif lapangan bulutangkis"
        >
          <rect x="36" y="30" width="688" height="304" fill="#F5F3EE" stroke="#141824" strokeWidth="2" />

          {courts.slice(0, 3).map((court, index) => {
            const slot = SLOTS[index];
            const style = COURT_STYLES[index % COURT_STYLES.length];
            const isActive = activeCourt?.id === court.id;
            const top = 52;
            const zoneHeight = 264;
            const matTop = 64;
            const matHeight = 214;
            const netY = matTop + matHeight / 2;
            const matFill = isActive ? style.accent : "#EAE6DD";
            const matLine = isActive ? "#FAF9F6" : "#141824";
            const matLineOpacity = isActive ? 0.9 : 0.45;

            return (
              <g
                key={court.id}
                className="cursor-pointer"
                role="button"
                tabIndex={0}
                aria-label={`Pilih ${court.name}`}
                aria-pressed={isActive}
                onClick={() => onSelectCourt(court.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectCourt(court.id);
                  }
                }}
              >
                <rect
                  x={slot.zoneX}
                  y={top}
                  width={slot.zoneW}
                  height={zoneHeight}
                  fill="#FAF9F6"
                  stroke="#141824"
                  strokeWidth="1.2"
                />
                {isActive ? (
                  <rect
                    x={slot.zoneX - 4}
                    y={top - 4}
                    width={slot.zoneW + 8}
                    height={zoneHeight + 8}
                    fill="none"
                    stroke="#C84B31"
                    strokeWidth="2.5"
                  />
                ) : null}

                <rect x={slot.zoneX} y={top} width={slot.zoneW} height="5" fill={style.accent} />
                {!court.isActive ? (
                  <rect
                    x={slot.zoneX}
                    y={top}
                    width={slot.zoneW}
                    height={zoneHeight}
                    fill="url(#hatch-inactive)"
                    stroke="none"
                  />
                ) : null}

                <rect x={slot.matX} y={matTop} width={slot.matW} height={matHeight} fill={matFill} />

                <rect
                  x={slot.matX + 6}
                  y={matTop + 6}
                  width={slot.matW - 12}
                  height={matHeight - 12}
                  stroke={matLine}
                  strokeOpacity={matLineOpacity}
                  strokeWidth="1.3"
                  fill="none"
                />
                <line x1={slot.matX + 16} y1={matTop + 6} x2={slot.matX + 16} y2={matTop + matHeight - 6} stroke={matLine} strokeOpacity={matLineOpacity} strokeWidth="1" />
                <line x1={slot.matX + slot.matW - 16} y1={matTop + 6} x2={slot.matX + slot.matW - 16} y2={matTop + matHeight - 6} stroke={matLine} strokeOpacity={matLineOpacity} strokeWidth="1" />
                <line x1={slot.matX + 6} y1={matTop + 20} x2={slot.matX + slot.matW - 6} y2={matTop + 20} stroke={matLine} strokeOpacity={matLineOpacity} strokeWidth="1" />
                <line x1={slot.matX + 6} y1={matTop + matHeight - 20} x2={slot.matX + slot.matW - 6} y2={matTop + matHeight - 20} stroke={matLine} strokeOpacity={matLineOpacity} strokeWidth="1" />
                <line x1={slot.matX + 6} y1={matTop + 79} x2={slot.matX + slot.matW - 6} y2={matTop + 79} stroke={matLine} strokeOpacity={matLineOpacity} strokeWidth="1" />
                <line x1={slot.matX + 6} y1={matTop + 135} x2={slot.matX + slot.matW - 6} y2={matTop + 135} stroke={matLine} strokeOpacity={matLineOpacity} strokeWidth="1" />
                <line x1={slot.half} y1={matTop + 6} x2={slot.half} y2={matTop + 79} stroke={matLine} strokeOpacity={matLineOpacity} strokeWidth="1" />
                <line x1={slot.half} y1={matTop + 135} x2={slot.half} y2={matTop + matHeight - 6} stroke={matLine} strokeOpacity={matLineOpacity} strokeWidth="1" />
                <line
                  x1={slot.matX - 2}
                  y1={netY}
                  x2={slot.matX + slot.matW + 2}
                  y2={netY}
                  stroke={matLine}
                  strokeWidth="1.8"
                  strokeDasharray="4 2"
                />

                <text
                  x={slot.half}
                  y={top + 259}
                  textAnchor="middle"
                  fill="#141824"
                  fontFamily="JetBrains Mono, monospace"
                  fontSize="10"
                  fontWeight="700"
                >
                  {style.code}
                </text>
                {!court.isActive ? (
                  <text
                    x={slot.half}
                    y={top + 244}
                    textAnchor="middle"
                    fill="#C84B31"
                    fontFamily="JetBrains Mono, monospace"
                    fontSize="8"
                    fontWeight="700"
                  >
                    NONAKTIF
                  </text>
                ) : null}
              </g>
            );
          })}

          <defs>
            <pattern
              id="hatch-inactive"
              width="6"
              height="6"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <line x1="0" y1="0" x2="0" y2="6" stroke="#141824" strokeOpacity="0.18" strokeWidth="1" />
            </pattern>
          </defs>

          <rect x="130" y="340" width="500" height="20" fill="#141824" rx="2" />
          <text
            x="380"
            y="353"
            textAnchor="middle"
            fill="#FAF9F6"
            fontFamily="JetBrains Mono, monospace"
            fontSize="9"
            fontWeight="600"
            letterSpacing="1.5"
          >
            ▲ PINTU MASUK UTAMA · RESEPSIONIS · RUANG BILAS
          </text>
        </svg>
      </div>

      {activeCourt ? (
        <div className="border-t border-[#141824] bg-[#EAE6DD] p-4">
          <div className="mb-3 flex flex-col justify-between gap-3 border-b border-[#141824]/20 pb-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className="inline-block h-3 w-3 rounded-[1px]"
                style={{ backgroundColor: activeStyle.accent }}
              />
              <span className="font-mono text-xs font-bold uppercase tracking-wide text-[#141824] sm:text-sm">
                {activeCourt.name}
              </span>
            </div>
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#C84B31]">
              {formatCurrency(activeCourt.pricePerHour)} / jam
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 font-mono text-xs sm:grid-cols-3">
            <div>
              <span className="block text-[10px] uppercase text-[#6E6A61]">Spesifikasi Matras</span>
              <span className="mt-0.5 block font-semibold text-[#141824]">
                {activeCourt.description ?? "Vinyl BWF 7.0 MM + sub-lantai pegas"}
              </span>
            </div>
            <div>
              <span className="block text-[10px] uppercase text-[#6E6A61]">Pencahayaan</span>
              <span className="mt-0.5 block font-semibold text-[#141824]">
                800 lux side-LED anti-silau (CRI &gt; 90)
              </span>
            </div>
            <div>
              <span className="block text-[10px] uppercase text-[#6E6A61]">Status Unit</span>
              <span
                className={cn(
                  "mt-0.5 block font-bold uppercase",
                  activeCourt.isActive ? "text-[#1E3A8A]" : "text-[#C84B31]"
                )}
              >
                {activeCourt.isActive ? "Tersedia untuk reservasi" : "Dinonaktifkan admin"}
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
