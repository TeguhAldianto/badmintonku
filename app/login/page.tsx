"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (response?.error) {
        setError("Email atau kata sandi tidak cocok");
        return;
      }

      router.push("/admin/dashboard");
      router.refresh();
    } catch {
      setError("Tidak dapat menghubungi server autentikasi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* Blueprint panel */}
      <div className="relative hidden flex-col justify-between border-r border-navy bg-navy p-10 text-paper lg:flex">
        <div className="architectural-grid absolute inset-0 opacity-[0.06]" aria-hidden="true" />

        <div className="relative">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-[2px] border border-paper/40">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 20H20" stroke="currentColor" strokeWidth="2" />
                <path
                  d="M12 17L6.5 6L10.5 8.5L12 4.5L13.5 8.5L17.5 6L12 17Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="miter"
                />
              </svg>
            </span>
            <span className="font-display text-sm font-bold tracking-tight">OMAH GUYUB</span>
          </Link>
        </div>

        <div className="relative max-w-sm">
          <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-terracotta">
            Akses terbatas · Lembar 00
          </span>
          <h1 className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight">
            Ruang kendali operasional arena.
          </h1>
          <p className="mt-3 text-xs leading-relaxed text-birch/70">
            Verifikasi pembayaran, kelola jadwal lapangan, dan pantau laporan pendapatan dari satu
            panel. Setiap tindakan tercatat pada riwayat status reservasi.
          </p>
        </div>

        <dl className="relative grid grid-cols-2 gap-px border border-paper/20 bg-paper/20 font-mono text-[11px] uppercase tracking-wider">
          <div className="bg-navy p-3">
            <dt className="text-birch/50">Modul</dt>
            <dd className="mt-1 text-paper">Reservasi · Pembayaran</dd>
          </div>
          <div className="bg-navy p-3">
            <dt className="text-birch/50">Autentikasi</dt>
            <dd className="mt-1 text-paper">Kredensial terenkripsi</dd>
          </div>
        </dl>
      </div>

      {/* Form panel */}
      <div className="flex flex-col justify-center px-4 py-10 sm:px-8 lg:px-14">
        <div className="mx-auto w-full max-w-sm">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-slate-muted transition-colors hover:text-navy"
          >
            <ArrowLeft className="h-3 w-3" strokeWidth={2} />
            Kembali ke arena
          </Link>

          <div className="mt-8 border-b border-navy/25 pb-4">
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-terracotta">
              Panel pengelola
            </span>
            <h2 className="mt-1.5 font-display text-2xl font-bold tracking-tight text-navy">
              Masuk ke akun admin
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-muted">
              Gunakan kredensial yang diberikan pengelola sistem. Sesi tidak berlaku untuk pemesan
              tamu.
            </p>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            {error ? (
              <div
                role="alert"
                className="rounded-[2px] border border-terracotta/50 bg-terracotta/10 px-3 py-2 font-mono text-[11px] font-semibold uppercase tracking-wide text-terracotta"
              >
                {error}
              </div>
            ) : null}

            <div>
              <label
                htmlFor="email"
                className="mb-1 block font-mono text-[11px] font-bold uppercase tracking-wider text-navy"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="nama@badmintonku.com"
                className="w-full rounded-[2px] border border-navy/30 bg-paper px-3 py-2.5 font-mono text-sm text-navy outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt transition-colors placeholder:text-slate-muted/60 focus:border-navy"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1 block font-mono text-[11px] font-bold uppercase tracking-wider text-navy"
              >
                Kata sandi
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                className="w-full rounded-[2px] border border-navy/30 bg-paper px-3 py-2.5 font-mono text-sm text-navy outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt transition-colors placeholder:text-slate-muted/60 focus:border-navy"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-[2px] border border-navy bg-navy px-4 py-3 font-mono text-xs font-bold uppercase tracking-wider text-paper transition-colors hover:bg-terracotta hover:border-terracotta disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                  Memverifikasi…
                </>
              ) : (
                "Masuk ke panel"
              )}
            </button>
          </form>

          <p className="mt-6 border-t border-navy/15 pt-4 font-mono text-[11px] uppercase leading-relaxed tracking-wide text-slate-muted">
            Lupa kata sandi? Hubungi pengelola sistem untuk pengaturan ulang melalui basis data.
          </p>
        </div>
      </div>
    </div>
  );
}
