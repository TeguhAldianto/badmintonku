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
  title: "KLAB TANGKIS — Ruang Bulutangkis",
  description: "Arena bulutangkis arsitektural dengan fasilitas standar BWF.",
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
      <body className="min-h-full flex flex-col font-sans bg-[#F5F3EE] text-[#141824]">
        <Providers>
          <SiteHeader />
          <div className="min-w-0 flex-1">{children}</div>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}