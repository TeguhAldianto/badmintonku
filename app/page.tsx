import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-border sticky top-0 z-50 transition-all">
        <div className="container-app flex items-center justify-between h-16">
          <Link href="/" className="text-xl font-extrabold text-primary flex items-center gap-2 tracking-tight">
            <span className="text-2xl animate-bounce">🏸</span>
            BadmintonKu
          </Link>
          <nav className="flex items-center gap-3 sm:gap-4">
            <Link href="/courts" className="text-text hover:text-primary transition-colors text-sm font-medium hidden sm:block">
              Cari Lapangan
            </Link>
            <Link href="/booking" className="btn-primary px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:shadow transition-all">
              Booking Sekarang
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="py-20 lg:py-28 bg-gradient-to-b from-primary/10 via-primary/5 to-background relative overflow-hidden">
          <div className="container-app relative z-10">
            <div className="max-w-3xl mx-auto text-center space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold tracking-wide uppercase">
                ⚡ Pemesanan Lapangan Badminton Real-time
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-text leading-tight tracking-tight">
                Main Badminton Lebih Praktis, <br className="hidden sm:block" />
                <span className="text-primary bg-gradient-to-r from-primary to-emerald-600 bg-clip-text text-transparent">Tanpa Antri</span>
              </h1>
              <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
                Pilih tanggal, cek ketersediaan jam main secara instan, dan amankan lapangan pilihanmu hanya dalam beberapa klik.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                <Link href="/booking" className="w-full sm:w-auto">
                  <Button className="w-full sm:w-auto px-8 py-6 text-base font-bold btn-primary rounded-xl shadow-md hover:shadow-lg transition-all">
                    Mulai Booking Sekarang
                  </Button>
                </Link>
                <Link href="/courts" className="w-full sm:w-auto">
                  <Button variant="outline" className="w-full sm:w-auto px-8 py-6 text-base font-medium rounded-xl border-border bg-white text-text hover:bg-gray-50">
                    Lihat Lapangan & Harga
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20 bg-background-alt">
          <div className="container-app">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-text mb-4">Kenapa BadmintonKu?</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">Pengalaman booking yang dirancang untuk pemain badminton modern</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="card-custom hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-3xl">📅</span>
                  </div>
                  <h3 className="text-lg font-semibold text-text mb-2">Jadwal Real-time</h3>
                  <p className="text-gray-600">Lihat ketersediaan lapangan secara langsung, tidak ada double booking.</p>
                </CardContent>
              </Card>
              <Card className="card-custom hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-3xl">⚡</span>
                  </div>
                  <h3 className="text-lg font-semibold text-text mb-2">Proses Cepat</h3>
                  <p className="text-gray-600">Booking selesai dalam 3 langkah: Tanggal → Lapangan → Jam.</p>
                </CardContent>
              </Card>
              <Card className="card-custom hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-3xl">📱</span>
                  </div>
                  <h3 className="text-lg font-semibold text-text mb-2">Notifikasi WhatsApp</h3>
                  <p className="text-gray-600">Dapatkan konfirmasi booking dan pengingat jadwal langsung ke WhatsApp.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Courts Preview */}
        <section className="py-20">
          <div className="container-app">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-text mb-4">Lapangan Kami</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">3 lapangan indoor standar internasional dengan pencahayaan LED dan AC</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {[1, 2, 3].map((num) => (
                <Card key={num} className="card-custom overflow-hidden hover:shadow-xl transition-shadow">
                  <div className="h-40 bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
                    <span className="text-6xl font-bold text-white/20">Lapangan {num}</span>
                  </div>
                  <CardContent className="p-6">
                    <h3 className="text-xl font-semibold text-text mb-2">Lapangan {num}</h3>
                    <p className="text-gray-600 mb-4">Lapangan indoor standar dengan lantai kayu sintetis, AC, dan pencahayaan LED profesional.</p>
                    <ul className="space-y-2 text-sm text-gray-600 mb-6">
                      <li className="flex items-center gap-2">✓ Lantai kayu sintetis premium</li>
                      <li className="flex items-center gap-2">✓ AC pendingin ruangan</li>
                      <li className="flex items-center gap-2">✓ Pencahayaan LED standar BWF</li>
                    </ul>
                    <Link href="/courts">
                      <Button className="w-full btn-primary">Pilih Lapangan Ini</Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="text-center mt-10">
              <Link href="/courts">
                <Button className="px-8 py-4 text-lg border border-border bg-white text-text hover:bg-gray-50">
                  Lihat Semua Lapangan
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-primary text-white">
          <div className="container-app text-center">
            <h2 className="text-3xl font-bold mb-4">Siap Main Badminton?</h2>
            <p className="text-white/80 mb-8 max-w-xl mx-auto">Booking sekarang dan main besok. Proses cepat, jadwal real-time, pembayaran aman.</p>
            <Link href="/courts">
              <Button className="bg-white text-primary hover:bg-gray-100 px-8 py-4 text-lg">
                Booking Sekarang
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-background-alt border-t border-border py-12">
        <div className="container-app">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-bold text-text mb-4 flex items-center gap-2">
                <span className="text-2xl">🏸</span>
                BadmintonKu
              </h3>
              <p className="text-gray-600 text-sm">Platform booking lapangan badminton terpercaya untuk pemain Indonesia.</p>
            </div>
            <div>
              <h4 className="font-semibold text-text mb-4">Layanan</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><Link href="/courts" className="hover:text-primary">Cari Lapangan</Link></li>
                <li><Link href="/courts" className="hover:text-primary">Lihat Jadwal</Link></li>
                <li><Link href="/dashboard" className="hover:text-primary">Dashboard</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-text mb-4">Bantuan</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>Cara Booking</li>
                <li>Syarat & Ketentuan</li>
                <li>Kebijakan Privasi</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-text mb-4">Kontak</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>WhatsApp: 08xx-xxxx-xxxx</li>
                <li>Email: info@badmintonku.com</li>
                <li>Instagram: @badmintonku</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border mt-8 pt-8 text-center text-sm text-gray-500">
            © 2025 BadmintonKu. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}