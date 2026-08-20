import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default async function AdminSettingsPage() {
  const admin = await prisma.admin.findFirst();
  const config = await prisma.config.findUnique({ where: { key: "operational_hours" } });
  const hours = config ? JSON.parse(config.value) : { open: 8, close: 21 };

  return (
    <div className="space-y-8 max-w-2xl">
      <h1 className="text-3xl font-bold text-text">Pengaturan Sistem</h1>

      <Card className="card-custom">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-4">Informasi Akun Admin</h2>
          <form className="space-y-4" action="/api/admin/settings" method="POST">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <Input value={admin?.email || ""} disabled className="bg-gray-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama</label>
              <Input name="name" defaultValue={admin?.name || ""} required />
            </div>
            <Button type="submit" className="btn-primary">Simpan Perubahan</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="card-custom">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-4">Konfigurasi Harga</h2>
          <form className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Harga per Jam (Default)</label>
              <Input type="number" defaultValue="50000" className="w-48" />
              <p className="text-xs text-gray-500 mt-1">Harga default untuk semua lapangan</p>
            </div>
            <Button type="submit" className="btn-primary">Simpan Harga</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="card-custom">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-4">Jam Operasional</h2>
          <form className="space-y-4 max-w-md" action="/api/admin/settings" method="POST">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Buka (Jam)</label>
                <Input type="number" name="openHour" defaultValue={hours.open} min="0" max="23" className="w-24" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tutup (Jam)</label>
                <Input type="number" name="closeHour" defaultValue={hours.close} min="0" max="23" className="w-24" required />
              </div>
            </div>
            <Button type="submit" className="btn-primary">Simpan Jam Operasional</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="card-custom border-red-200">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Zona Bahaya</h2>
          <p className="text-gray-600 mb-4">Operasi berikut tidak bisa dibatalkan dan akan menghapus data permanen.</p>
          <div className="flex gap-4">
            <Button variant="destructive" className="bg-red-600 hover:bg-red-700">
              Reset Semua Booking (Testing)
            </Button>
            <Button variant="destructive" className="bg-red-600 hover:bg-red-700">
              Hapus Semua Data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}