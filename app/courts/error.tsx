'use client';

import { Button } from "@/components/ui/button";

export default function Error({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="container-app py-20 text-center space-y-4">
      <h2 className="text-2xl font-bold">Terjadi Kesalahan</h2>
      <Button onClick={reset}>Coba Lagi</Button>
    </div>
  );
}
