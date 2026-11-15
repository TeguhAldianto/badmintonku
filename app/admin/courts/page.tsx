"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Court {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
}

export default function AdminCourtsPage() {
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCourt, setEditingCourt] = useState<Court | null>(null);
  const [editForm, setEditForm] = useState({ name: "", description: "", isActive: true });

  const fetchCourts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/courts");
      const data = await res.json();
      setCourts(data.data || []);
    } catch {
      toast.error("Gagal memuat lapangan");
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
  };

  const handleSave = async () => {
    try {
      const res = await fetch(`/api/courts/${editingCourt?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Lapangan diperbarui");
        fetchCourts();
        setEditingCourt(null);
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error("Gagal menyimpan");
    }
  };

  const handleToggleActive = async (court: Court) => {
    try {
      const res = await fetch(`/api/courts/${court.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !court.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Lapangan ${!court.isActive ? "diaktifkan" : "dinonaktifkan"}`);
        fetchCourts();
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error("Gagal mengubah status");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#141824] pb-3">
        <div>
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#C84B31]">
            Modul 05
          </span>
          <h1 className="mt-1 font-display text-xl font-bold tracking-tight sm:text-2xl">
            Manajemen Lapangan
          </h1>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-[#6E6A61]">
          {courts.filter((court) => court.isActive).length} aktif · {courts.length} total
        </span>
      </div>

      <section className="border border-[#141824] bg-[#FAF9F6]">
        {loading ? (
          <p className="px-4 py-10 text-center font-mono text-[11px] uppercase tracking-wider text-[#6E6A61]">
            Memuat data lapangan…
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#141824] bg-[#EAE6DD]">
                  {["ID", "Nama", "Deskripsi", "Status", "Aksi"].map((header) => (
                    <th
                      key={header}
                      className="whitespace-nowrap px-3 py-2 font-mono text-[9px] font-bold uppercase tracking-wider text-[#141824]"
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
                    className="border-b border-[#141824]/10 last:border-0 hover:bg-[#EAE6DD]/40"
                  >
                    <td className="px-3 py-2.5 font-mono text-[11px] text-[#6E6A61]">
                      {court.id.toString().padStart(2, "0")}
                    </td>
                    <td className="px-3 py-2.5">
                      {editingCourt?.id === court.id ? (
                        <Input
                          value={editForm.name}
                          onChange={(event) =>
                            setEditForm({ ...editForm, name: event.target.value })
                          }
                          placeholder="Nama lapangan"
                          className="h-8 w-40 text-xs"
                        />
                      ) : (
                        <span className="text-xs font-semibold text-[#141824]">{court.name}</span>
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
                          className="h-8 w-56 text-xs"
                        />
                      ) : (
                        <span className="block truncate text-[11px] text-[#6E6A61]">
                          {court.description || "-"}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <span
                        className={
                          court.isActive
                            ? "rounded-[2px] border border-[#1E3A8A]/40 bg-[#1E3A8A]/10 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-[#1E3A8A]"
                            : "slot-occupied rounded-[2px] border border-[#141824]/25 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-[#6E6A61]"
                        }
                      >
                        {court.isActive ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      {editingCourt?.id === court.id ? (
                        <div className="flex gap-1.5">
                          <Button size="sm" variant="navy" onClick={handleSave}>
                            Simpan
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingCourt(null)}
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
                            onClick={() => handleToggleActive(court)}
                          >
                            {court.isActive ? "Nonaktifkan" : "Aktifkan"}
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

      <div className="border border-[#141824]/25 bg-[#EAE6DD] px-4 py-3">
        <p className="font-mono text-[10px] uppercase leading-relaxed tracking-wide text-[#6E6A61]">
          Tarif per jam tidak diatur per lapangan. Nilai harga tunggal dikelola pada menu Pengaturan
          melalui kunci konfigurasi harga.
        </p>
      </div>
    </div>
  );
}
