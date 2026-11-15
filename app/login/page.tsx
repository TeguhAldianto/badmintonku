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
      <div className="relative hidden flex-col justify-between border-r border-[#141824] bg-[#141824] p-10 text-[#FAF9F6] lg:flex">
        <div className="architectural-grid absolute inset-0 opacity-[0.06]" aria-hidden="true" />

        <div className="relative">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-[2px] border border-[#FAF9F6]/40">
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
          <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#C84B31]">
            Akses terbatas · Lembar 00
          </span>
          <h1 className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight">
            Ruang kendali operasional arena.
          </h1>
          <p className="mt-3 text-xs leading-relaxed text-[#EAE6DD]/70">
            Verifikasi pembayaran, kelola jadwal lapangan, dan pantau laporan pendapatan dari satu
            panel. Setiap tindakan tercatat pada riwayat status reservasi.
          </p>
        </div>

        <dl className="relative grid grid-cols-2 gap-px border border-[#FAF9F6]/20 bg-[#FAF9F6]/20 font-mono text-[10px] uppercase tracking-wider">
          <div className="bg-[#141824] p-3">
            <dt className="text-[#EAE6DD]/50">Modul</dt>
            <dd className="mt-1 text-[#FAF9F6]">Reservasi · Pembayaran</dd>
          </div>
          <div className="bg-[#141824] p-3">
            <dt className="text-[#EAE6DD]/50">Autentikasi</dt>
            <dd className="mt-1 text-[#FAF9F6]">Kredensial terenkripsi</dd>
          </div>
        </dl>
      </div>

      {/* Form panel */}
      <div className="flex flex-col justify-center px-4 py-10 sm:px-8 lg:px-14">
        <div className="mx-auto w-full max-w-sm">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[#6E6A61] transition-colors hover:text-[#141824]"
          >
            <ArrowLeft className="h-3 w-3" strokeWidth={2} />
            Kembali ke arena
          </Link>

          <div className="mt-8 border-b border-[#141824]/25 pb-4">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#C84B31]">
              Panel pengelola
            </span>
            <h2 className="mt-1.5 font-display text-2xl font-bold tracking-tight text-[#141824]">
              Masuk ke akun admin
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-[#6E6A61]">
              Gunakan kredensial yang diberikan pengelola sistem. Sesi tidak berlaku untuk pemesan
              tamu.
            </p>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            {error ? (
              <div
                role="alert"
                className="rounded-[2px] border border-[#C84B31]/50 bg-[#C84B31]/10 px-3 py-2 font-mono text-[11px] font-semibold uppercase tracking-wide text-[#C84B31]"
              >
                {error}
              </div>
            ) : null}

            <div>
              <label
                htmlFor="email"
                className="mb-1 block font-mono text-[11px] font-bold uppercase tracking-wider text-[#141824]"
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
                className="w-full rounded-[2px] border border-[#141824]/30 bg-[#FAF9F6] px-3 py-2.5 font-mono text-sm text-[#141824] outline-none transition-colors placeholder:text-[#6E6A61]/60 focus:border-[#141824]"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1 block font-mono text-[11px] font-bold uppercase tracking-wider text-[#141824]"
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
                className="w-full rounded-[2px] border border-[#141824]/30 bg-[#FAF9F6] px-3 py-2.5 font-mono text-sm text-[#141824] outline-none transition-colors placeholder:text-[#6E6A61]/60 focus:border-[#141824]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-[2px] border border-[#141824] bg-[#141824] px-4 py-3 font-mono text-xs font-bold uppercase tracking-wider text-[#FAF9F6] transition-colors hover:bg-[#C84B31] hover:border-[#C84B31] disabled:cursor-not-allowed disabled:opacity-50"
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

          <p className="mt-6 border-t border-[#141824]/15 pt-4 font-mono text-[10px] uppercase leading-relaxed tracking-wide text-[#6E6A61]">
            Lupa kata sandi? Hubungi pengelola sistem untuk pengaturan ulang melalui basis data.
          </p>
        </div>
      </div>
    </div>
  );
}
