"use client";

interface ReportChartsProps {
  data: Array<{ hour: string; count: number }>;
}

/**
 * Grafik batang sederhana tanpa pustaka chart: hanya div berukuran proporsional
 * dengan garis 1px dan warna arsitektural (navy / cobalt / terracotta).
 */
export default function ReportCharts({ data }: ReportChartsProps) {
  if (data.length === 0) {
    return (
      <div className="border border-dashed border-[#141824]/30 bg-[#FAF9F6] px-4 py-10 text-center">
        <p className="font-mono text-[11px] uppercase tracking-wider text-[#6E6A61]">
          Belum ada data jam tersibuk
        </p>
      </div>
    );
  }

  const max = Math.max(...data.map((item) => item.count), 1);

  return (
    <div className="border border-[#141824] bg-[#FAF9F6]">
      <header className="flex items-center justify-between border-b border-[#141824] bg-[#EAE6DD] px-4 py-2.5">
        <h2 className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#141824]">
          Distribusi jam tersibuk
        </h2>
        <span className="font-mono text-[10px] uppercase tracking-wider text-[#6E6A61]">
          Maks. {max} booking
        </span>
      </header>

      <div className="space-y-2 p-4">
        {data.map((item) => {
          const width = Math.max(6, Math.round((item.count / max) * 100));
          return (
            <div key={item.hour} className="flex items-center gap-3">
              <span className="w-[104px] shrink-0 whitespace-nowrap font-mono text-[10px] font-semibold tabular-nums text-[#6E6A61]">
                {item.hour}
              </span>
              <div className="h-4 flex-1 border border-[#141824]/20 bg-[#F5F3EE]">
                <div
                  className="h-full bg-[#1E3A8A]"
                  style={{ width: `${width}%` }}
                  aria-hidden="true"
                />
              </div>
              <span className="w-10 shrink-0 text-right font-mono text-[10px] font-bold tabular-nums text-[#141824]">
                {item.count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
