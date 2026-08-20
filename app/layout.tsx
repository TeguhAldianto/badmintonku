import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BadmintonKu - Booking Lapangan Badminton",
  description: "Platform booking lapangan badminton online yang mudah, cepat, dan terpercaya",
};

export default function RootLayout({ children }: React.PropsWithChildren) {
  const midtransClientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || "";
  const midtransIsProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";
  const midtransScriptUrl = midtransIsProduction
    ? "https://app.midtrans.com/snap/snap.js"
    : "https://app.sandbox.midtrans.com/snap/snap.js";

  return (
    <html lang="id" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        <Script
          src={midtransScriptUrl}
          data-client-key={midtransClientKey}
          strategy="lazyOnload"
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-text">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}