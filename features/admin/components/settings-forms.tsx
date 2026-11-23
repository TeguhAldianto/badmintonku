"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { OperatingHours } from "@/features/booking/types";

interface SettingsFormsProps {
  adminName: string;
  email: string;
  hours: OperatingHours;
  pricePerHour: number;
}

async function submitSettings(values: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) {
    formData.append(key, value);
  }

  const res = await fetch("/api/admin/settings", { method: "POST", body: formData });
  return res.json() as Promise<{ success: boolean; message?: string }>;
}

const LABEL_CLASS =
  "mb-1 block font-mono text-[11px] font-bold uppercase tracking-wider text-slate-muted";

const SECTION_TITLE = "font-mono text-[11px] font-bold uppercase tracking-wider text-navy";

export function SettingsForms({ adminName, email, hours, pricePerHour }: SettingsFormsProps) {
  const router = useRouter();
  const [saving, setSaving] = useState<string | null>(null);
  const [name, setName] = useState(adminName);
  const [openHour, setOpenHour] = useState(String(hours.open));
  const [closeHour, setCloseHour] = useState(String(hours.close));
  const [price, setPrice] = useState(String(pricePerHour));

  const handleSave = async (key: string, values: Record<string, string>, successMessage: string) => {
    setSaving(key);
    try {
      const data = await submitSettings(values);
      if (data.success) {
        toast.success(successMessage);
        router.refresh();
      } else {
        toast.error(data.message ?? "Gagal menyimpan pengaturan");
      }
    } catch {
      toast.error("Gagal menyimpan pengaturan");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-4">
      <section className="border border-navy bg-paper">
        <header className="border-b border-navy bg-birch px-4 py-2.5">
          <h2 className={SECTION_TITLE}>Informasi akun admin</h2>
        </header>
        <div className="space-y-3 p-4">
          <div>
            <label className={LABEL_CLASS} htmlFor="settings-email">
              Email
            </label>
            <Input id="settings-email" value={email} disabled className="bg-birch" />
            <p className="mt-1 font-mono text-[11px] uppercase tracking-wide text-slate-muted">
              Email dipakai untuk login admin sehingga tidak dapat diubah dari panel.
            </p>
          </div>
          <div>
            <label className={LABEL_CLASS} htmlFor="settings-name">
              Nama
            </label>
            <Input id="settings-name" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <Button
            variant="navy"
            onClick={() => handleSave("name", { name }, "Nama admin diperbarui")}
            disabled={saving === "name" || name.trim().length < 2}
          >
            {saving === "name" ? "Menyimpan…" : "Simpan nama"}
          </Button>
          {name.trim().length < 2 ? (
            <p role="status" className="font-mono text-[11px] uppercase tracking-wide text-terracotta">
              Tombol aktif setelah nama berisi minimal 2 karakter.
            </p>
          ) : null}
        </div>
      </section>

      <section className="border border-navy bg-paper">
        <header className="border-b border-navy bg-birch px-4 py-2.5">
          <h2 className={SECTION_TITLE}>Konfigurasi harga</h2>
        </header>
        <div className="space-y-3 p-4">
          <div>
            <label className={LABEL_CLASS} htmlFor="settings-price">
              Harga per jam
            </label>
            <Input
              id="settings-price"
              type="number"
              min={1000}
              step={1000}
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              className="w-48 font-mono tabular-nums"
            />
            <p className="mt-1 font-mono text-[11px] uppercase leading-relaxed tracking-wide text-slate-muted">
              Berlaku untuk semua lapangan dan dihitung ulang di server saat booking dibuat.
            </p>
          </div>
          <Button
            variant="navy"
            onClick={() => handleSave("price", { pricePerHour: price }, "Harga per jam disimpan")}
            disabled={saving === "price" || Number(price) <= 0}
          >
            {saving === "price" ? "Menyimpan…" : "Simpan harga"}
          </Button>
          {Number(price) <= 0 ? (
            <p role="status" className="font-mono text-[11px] uppercase tracking-wide text-terracotta">
              Harga harus lebih besar dari 0 sebelum dapat disimpan.
            </p>
          ) : null}
        </div>
      </section>

      <section className="border border-navy bg-paper">
        <header className="border-b border-navy bg-birch px-4 py-2.5">
          <h2 className={SECTION_TITLE}>Jam operasional</h2>
        </header>
        <div className="space-y-3 p-4">
          <div className="grid max-w-xs grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLASS} htmlFor="settings-open">
                Buka (jam)
              </label>
              <Input
                id="settings-open"
                type="number"
                value={openHour}
                onChange={(event) => setOpenHour(event.target.value)}
                min={0}
                max={23}
                className="font-mono tabular-nums"
              />
            </div>
            <div>
              <label className={LABEL_CLASS} htmlFor="settings-close">
                Tutup (jam)
              </label>
              <Input
                id="settings-close"
                type="number"
                value={closeHour}
                onChange={(event) => setCloseHour(event.target.value)}
                min={1}
                max={24}
                className="font-mono tabular-nums"
              />
            </div>
          </div>
          <p className="font-mono text-[11px] uppercase leading-relaxed tracking-wide text-slate-muted">
            Rentang {String(hours.open).padStart(2, "0")}:00–
            {String(hours.close).padStart(2, "0")}:00 WIB saat ini. Slot di luar rentang tidak dapat
            dipesan.
          </p>
          <Button
            variant="navy"
            onClick={() => handleSave("hours", { openHour, closeHour }, "Jam operasional disimpan")}
            disabled={saving === "hours" || Number(openHour) >= Number(closeHour)}
          >
            {saving === "hours" ? "Menyimpan…" : "Simpan jam operasional"}
          </Button>
          {Number(openHour) >= Number(closeHour) ? (
            <p role="status" className="font-mono text-[11px] uppercase tracking-wide text-terracotta">
              Jam buka harus lebih awal daripada jam tutup.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
