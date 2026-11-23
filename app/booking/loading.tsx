export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-1/3 rounded-[2px] bg-birch" />
        <div className="h-16 w-full rounded-[2px] border border-navy/20 bg-birch" />
        <div className="h-64 w-full rounded-[2px] border border-navy/20 bg-birch" />
      </div>
      <p className="mt-4 text-center font-mono text-[12px] uppercase tracking-wider text-slate-muted">
        Memuat halaman reservasi…
      </p>
    </div>
  );
}
