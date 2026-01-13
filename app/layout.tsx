import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Manrope, Philosopher } from "next/font/google";

import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";

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

export const metadata: Metadata = {
  title: "AlvVaz | Agencia de viajes premium",
  description:
    "Viajes premium a playas de México y destinos internacionales con atención personalizada.",
  icons: {
    icon: "/logoalvvaz.png",
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
        className={`${manrope.variable} ${philosopher.variable} bg-sand text-slate-900 antialiased`}
      >
        <Navbar />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
