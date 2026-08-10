"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
  const [editForm, setEditForm] = useState({ name: "", description: "", price: 50000, isActive: true });

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
      price: 50000, // Default price
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
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-text">Manajemen Lapangan</h1>

      <Card className="card-custom">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">Memuat...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deskripsi</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {courts.map((court) => (
                    <tr key={court.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-mono text-sm">{court.id}</td>
                      <td className="px-6 py-4 font-medium">{court.name}</td>
                      <td className="px-6 py-4 text-gray-600 max-w-xs truncate">{court.description || "-"}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          court.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}>
                          {court.isActive ? "Aktif" : "Tidak Aktif"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {editingCourt?.id === court.id ? (
                          <div className="flex gap-2">
                            <Input
                              value={editForm.name}
                              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                              placeholder="Nama"
                              className="w-40"
                            />
                            <Input
                              value={editForm.description}
                              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                              placeholder="Deskripsi"
                              className="w-48"
                            />
                            <Input
                              type="number"
                              value={editForm.price}
                              onChange={(e) => setEditForm({ ...editForm, price: parseInt(e.target.value) || 0 })}
                              placeholder="Harga/jam"
                              className="w-32"
                            />
                            <Button size="sm" onClick={handleSave}>Simpan</Button>
                            <Button variant="outline" size="sm" onClick={() => setEditingCourt(null)}>Batal</Button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleEdit(court)}>Edit</Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleActive(court)}
                              className={court.isActive ? "text-red-600 border-red-600 hover:bg-red-50" : "text-green-600 border-green-600 hover:bg-green-50"}
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
        </CardContent>
      </Card>
    </div>
  );
}