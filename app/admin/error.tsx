'use client';

export default function Error({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="p-10 text-center">
      <h2 className="text-xl font-bold mb-4">Gagal memuat admin</h2>
      <button onClick={reset} className="text-primary underline">Coba lagi</button>
    </div>
  );
}
