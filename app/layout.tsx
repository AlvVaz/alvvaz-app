import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Manrope, Montserrat, Philosopher } from "next/font/google";

import { SiteChrome } from "@/components/layout/site-chrome";

import "./globals.css";

const manrope = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const philosopher = Philosopher({
  variable: "--font-display-font",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "700"],
  style: ["normal", "italic"],
});

// Quote title only; not preloaded so public pages don't download it.
const montserrat = Montserrat({
  variable: "--font-quote-title",
  subsets: ["latin"],
  display: "swap",
  weight: ["800"],
  preload: false,
});

export const metadata: Metadata = {
  // Lets link previews (WhatsApp, Facebook...) resolve image paths to full URLs.
  metadataBase: new URL("https://alvvaz.com.mx"),
  title: "AlvVaz | Agencia de viajes premium",
  description:
    "Viajes premium a playas de México y destinos internacionales con atención personalizada.",
  openGraph: {
    title: "AlvVaz | Agencia de viajes premium",
    description: "Viajes premium a playas de México y destinos internacionales con atención personalizada.",
    siteName: "AlvVaz",
    locale: "es_MX",
    type: "website",
    images: ["/logoalvvaz.png"],
  },
  icons: {
    icon: [{ url: "/favicon.ico?v=3", type: "image/x-icon" }],
    apple: "/apple-touch-icon.png?v=3",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="es" className="scroll-smooth">
      <body
        className={`${manrope.variable} ${philosopher.variable} ${montserrat.variable} bg-sand text-slate-900 antialiased`}
      >
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
