import { getAdminSettings } from "@/features/admin/server/queries";
import { SettingsForms } from "@/features/admin/components/settings-forms";
import { formatCurrency } from "@/shared/lib/format";

export default async function AdminSettingsPage() {
  const { admin, hours, pricePerHour } = await getAdminSettings();

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#141824] pb-3">
        <div>
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#C84B31]">
            Modul 08
          </span>
          <h1 className="mt-1 font-display text-xl font-bold tracking-tight sm:text-2xl">
            Pengaturan Sistem
          </h1>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-[#6E6A61]">
          {formatCurrency(pricePerHour)} / jam · {String(hours.open).padStart(2, "0")}:00–
          {String(hours.close).padStart(2, "0")}:00 WIB
        </span>
      </div>

      <SettingsForms
        adminName={admin?.name ?? ""}
        email={admin?.email ?? ""}
        hours={hours}
        pricePerHour={pricePerHour}
      />

      <section className="border border-[#141824]/25 bg-[#EAE6DD] p-4">
        <h2 className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#141824]">
          Catatan operasional
        </h2>
        <p className="mt-1.5 text-xs leading-relaxed text-[#6E6A61]">
          Penghapusan data dan reset booking tidak disediakan dari antarmuka karena bersifat
          permanen. Gunakan perintah basis data secara manual bila benar-benar diperlukan, dan
          pastikan sudah membuat cadangan terlebih dahulu.
        </p>
      </section>
    </div>
  );
}
