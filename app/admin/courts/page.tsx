"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDialog } from "@/shared/lib/use-dialog";

interface Court {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
}

function ConfirmDeactivateDialog({
  court,
  loading,
  onCancel,
  onConfirm,
}: {
  court: Court;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dialogRef = useDialog<HTMLDivElement>(onCancel, !loading);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy/70 p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="court-confirm-heading"
      aria-describedby="court-confirm-description"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="w-full max-w-md overflow-hidden rounded-[2px] border border-navy bg-paper"
      >
        <header className="border-b border-navy bg-navy px-4 py-3 text-paper">
          <h3 id="court-confirm-heading" className="font-display text-base font-bold">
            Nonaktifkan {court.name}?
          </h3>
        </header>
        <div className="space-y-2 p-4">
          <p id="court-confirm-description" className="text-xs leading-relaxed text-slate-muted">
            Lapangan yang nonaktif tidak lagi muncul pada halaman reservasi publik. Booking yang
            sudah ada tidak berubah dan tetap dapat diselesaikan.
          </p>
        </div>
        <div className="flex flex-col gap-2 border-t border-navy/20 bg-birch px-4 py-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-[2px] border border-terracotta bg-terracotta px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-wider text-paper transition-colors hover:border-navy hover:bg-navy disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} />
                Memproses…
              </>
            ) : (
              "Ya, nonaktifkan"
            )}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="inline-flex min-h-11 items-center justify-center rounded-[2px] border border-navy/40 bg-paper px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-wider text-navy transition-colors hover:border-navy disabled:opacity-50"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminCourtsPage() {
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingCourt, setEditingCourt] = useState<Court | null>(null);
  const [editForm, setEditForm] = useState({ name: "", description: "", isActive: true });
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [pendingDeactivate, setPendingDeactivate] = useState<Court | null>(null);
  const [nameError, setNameError] = useState("");

  const fetchCourts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/courts", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message ?? "Gagal memuat lapangan");
      }
      setCourts(data.data || []);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Gagal memuat lapangan");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCourts();
  }, [fetchCourts]);

  const handleEdit = (court: Court) => {
    setEditingCourt(court);
    setEditForm({
      name: court.name,
      description: court.description || "",
      isActive: court.isActive,
    });
    setNameError("");
  };

  const handleSave = async () => {
    if (!editingCourt) return;
    if (editForm.name.trim().length < 2) {
      setNameError("Nama lapangan minimal 2 karakter.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/courts/${editingCourt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editForm, name: editForm.name.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Lapangan diperbarui");
        await fetchCourts();
        setEditingCourt(null);
      } else {
        toast.error(data.message ?? "Gagal menyimpan lapangan");
      }
    } catch {
      toast.error("Gagal menyimpan lapangan");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (court: Court) => {
    setTogglingId(court.id);
    try {
      const res = await fetch(`/api/courts/${court.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !court.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Lapangan ${!court.isActive ? "diaktifkan" : "dinonaktifkan"}`);
        setPendingDeactivate(null);
        await fetchCourts();
      } else {
        toast.error(data.message ?? "Gagal mengubah status lapangan");
      }
    } catch {
      toast.error("Gagal mengubah status lapangan");
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-navy pb-3">
        <div>
          <span className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-terracotta">
            Modul 05
          </span>
          <h1 className="mt-1 font-display text-xl font-bold tracking-tight sm:text-2xl">
            Manajemen Lapangan
          </h1>
        </div>
        <span className="font-mono text-[11px] uppercase tracking-wider text-slate-muted">
          {courts.filter((court) => court.isActive).length} aktif · {courts.length} total
        </span>
      </div>

      <section className="border border-navy bg-paper">
        {loading ? (
          <p className="px-4 py-10 text-center font-mono text-[11px] uppercase tracking-wider text-slate-muted">
            Memuat data lapangan…
          </p>
        ) : error ? (
          <div className="space-y-3 px-4 py-10 text-center">
            <p className="font-mono text-[11px] uppercase tracking-wider text-terracotta">
              Gagal memuat data lapangan
            </p>
            <p className="text-xs text-slate-muted">{error}</p>
            <button
              type="button"
              onClick={fetchCourts}
              className="min-h-11 rounded-[2px] border border-navy bg-navy px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-wider text-paper"
            >
              Coba lagi
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr className="border-b border-navy bg-birch">
                  {["ID", "Nama", "Deskripsi", "Status", "Aksi"].map((header) => (
                    <th
                      key={header}
                      scope="col"
                      className="whitespace-nowrap px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-wider text-navy"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {courts.map((court) => (
                  <tr
                    key={court.id}
                    className="border-b border-navy/10 last:border-0 hover:bg-birch/40"
                  >
                    <td className="px-3 py-2.5 font-mono text-[11px] text-slate-muted">
                      {court.id.toString().padStart(2, "0")}
                    </td>
                    <td className="px-3 py-2.5">
                      {editingCourt?.id === court.id ? (
                        <div>
                          <Input
                            value={editForm.name}
                            onChange={(event) => {
                              setEditForm({ ...editForm, name: event.target.value });
                              if (nameError) setNameError("");
                            }}
                            placeholder="Nama lapangan"
                            aria-label={`Nama lapangan ${court.name}`}
                            aria-invalid={Boolean(nameError)}
                            aria-describedby={nameError ? "court-name-error" : undefined}
                            className="h-9 w-40 text-xs"
                          />
                          {nameError ? (
                            <p
                              id="court-name-error"
                              role="alert"
                              className="mt-1 font-mono text-[11px] uppercase text-terracotta"
                            >
                              {nameError}
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-navy">{court.name}</span>
                      )}
                    </td>
                    <td className="max-w-xs px-3 py-2.5">
                      {editingCourt?.id === court.id ? (
                        <Input
                          value={editForm.description}
                          onChange={(event) =>
                            setEditForm({ ...editForm, description: event.target.value })
                          }
                          placeholder="Deskripsi"
                          aria-label={`Deskripsi lapangan ${court.name}`}
                          className="h-9 w-56 text-xs"
                        />
                      ) : (
                        <span className="block truncate text-[11px] text-slate-muted">
                          {court.description || "-"}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <span
                        className={
                          court.isActive
                            ? "rounded-[2px] border border-cobalt/40 bg-cobalt/10 px-1.5 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider text-cobalt"
                            : "slot-occupied rounded-[2px] border border-navy/25 px-1.5 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider text-slate-muted"
                        }
                      >
                        {court.isActive ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      {editingCourt?.id === court.id ? (
                        <div className="flex gap-1.5">
                          <Button size="sm" variant="navy" onClick={handleSave} disabled={saving}>
                            {saving ? (
                              <span className="inline-flex items-center gap-1.5">
                                <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} />
                                Menyimpan…
                              </span>
                            ) : (
                              "Simpan"
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingCourt(null)}
                            disabled={saving}
                          >
                            Batal
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-1.5">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(court)}>
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant={court.isActive ? "destructive" : "secondary"}
                            disabled={togglingId === court.id}
                            onClick={() => {
                              if (court.isActive) {
                                setPendingDeactivate(court);
                                return;
                              }
                              void handleToggleActive(court);
                            }}
                          >
                            {togglingId === court.id
                              ? "Memproses…"
                              : court.isActive
                                ? "Nonaktifkan"
                                : "Aktifkan"}
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="border border-navy/25 bg-birch px-4 py-3">
        <p className="font-mono text-[11px] leading-relaxed tracking-wide text-slate-muted">
          Tarif per jam tidak diatur per lapangan. Nilai harga tunggal dikelola pada menu Pengaturan
          melalui kunci konfigurasi harga.
        </p>
      </div>

      {pendingDeactivate ? (
        <ConfirmDeactivateDialog
          court={pendingDeactivate}
          loading={togglingId === pendingDeactivate.id}
          onCancel={() => setPendingDeactivate(null)}
          onConfirm={() => void handleToggleActive(pendingDeactivate)}
        />
      ) : null}
    </div>
  );
}
