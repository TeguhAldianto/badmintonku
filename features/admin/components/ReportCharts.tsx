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
      <div className="border border-dashed border-navy/30 bg-paper px-4 py-10 text-center">
        <p className="font-mono text-[11px] uppercase tracking-wider text-slate-muted">
          Belum ada data jam tersibuk
        </p>
      </div>
    );
  }

  const max = Math.max(...data.map((item) => item.count), 1);

  return (
    <div className="border border-navy bg-paper">
      <header className="flex items-center justify-between border-b border-navy bg-birch px-4 py-2.5">
        <h2 className="font-mono text-[11px] font-bold uppercase tracking-wider text-navy">
          Distribusi jam tersibuk
        </h2>
        <span className="font-mono text-[11px] uppercase tracking-wider text-slate-muted">
          Maks. {max} booking
        </span>
      </header>

      <div className="space-y-2 p-4">
        {data.map((item) => {
          const width = Math.max(6, Math.round((item.count / max) * 100));
          return (
            <div key={item.hour} className="flex items-center gap-3">
              <span className="w-[104px] shrink-0 whitespace-nowrap font-mono text-[11px] font-semibold tabular-nums text-slate-muted">
                {item.hour}
              </span>
              <div className="h-4 flex-1 border border-navy/20 bg-chalk">
                <div
                  className="h-full bg-cobalt"
                  style={{ width: `${width}%` }}
                  aria-hidden="true"
                />
              </div>
              <span className="w-10 shrink-0 text-right font-mono text-[11px] font-bold tabular-nums text-navy">
                {item.count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
