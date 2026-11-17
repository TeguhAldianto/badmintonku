import type { Metadata } from "next";
import Script from "next/script";
import { Space_Grotesk, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/shared/components/site-header";
import { SiteFooter } from "@/shared/components/site-footer";
import "./globals.css";

const display = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
});

const sans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "OMAH GUYUB — Arena Bulutangkis",
    template: "%s · OMAH GUYUB",
  },
  description:
    "Arena bulutangkis arsitektural dengan tiga lapangan indoor standar BWF dan reservasi daring.",
};

export default function RootLayout({ children }: React.PropsWithChildren) {
  const midtransClientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || "";
  const midtransIsProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";
  const midtransScriptUrl = midtransIsProduction
    ? "https://app.midtrans.com/snap/snap.js"
    : "https://app.sandbox.midtrans.com/snap/snap.js";

  return (
    <html lang="id" className={`${display.variable} ${sans.variable} ${mono.variable} h-full antialiased`}>
      <head>
        <Script
          src={midtransScriptUrl}
          data-client-key={midtransClientKey}
          strategy="lazyOnload"
        />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-chalk text-navy">
        <Providers>
          <a
            href="#konten"
            className="sr-only rounded-[2px] bg-navy px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-wider text-paper focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[60]"
          >
            Lewati ke konten utama
          </a>
          <SiteHeader />
          <main id="konten" className="min-w-0 flex-1">
            {children}
          </main>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}