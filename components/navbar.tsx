"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

const navItems = [
  { label: "Inicio", href: "/" },
  { label: "Servicios", href: "/servicios" },
  { label: "Promociones", href: "/promociones" },
  { label: "Revista", href: "/magazine" },
  { label: "Reservaciones", href: "/reservaciones" },
  { label: "Contáctanos", href: "/contacto" },
];

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/80">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/#top" className="flex items-center gap-3" aria-label="Ir al inicio">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-brand-200">
            <Image
              src="/logoalvvaz.png"
              alt="AlvVaz"
              width={32}
              height={32}
              className="h-8 w-8 object-contain"
              priority
            />
          </span>
          <span className="font-display text-lg font-semibold text-brand-950">
            AlvVaz
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative text-sm font-semibold uppercase tracking-[0.08em] text-slate-600 transition-colors duration-200 after:absolute after:-bottom-1.5 after:left-0 after:h-0.5 after:w-full after:origin-left after:scale-x-0 after:bg-brand-500 after:transition-transform after:duration-200 hover:text-brand-900 hover:after:scale-x-100",
                  isActive && "text-brand-950 after:scale-x-100"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          aria-label="Abrir menú"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((prev) => !prev)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-700 transition-colors duration-200 hover:border-brand-400 hover:text-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 md:hidden"
        >
          <span className="sr-only">Abrir menú</span>
          <div className="flex flex-col gap-1">
            <span className="h-0.5 w-5 rounded-full bg-current" />
            <span className="h-0.5 w-5 rounded-full bg-current" />
            <span className="h-0.5 w-5 rounded-full bg-current" />
          </div>
        </button>
      </div>

      <div
        className={cn(
          "fixed inset-0 z-[60] bg-slate-950/20 transition-opacity duration-200 md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => setOpen(false)}
        aria-hidden={!open}
      />

      <aside
        id="mobile-menu"
        className={cn(
          "fixed left-0 top-0 z-[70] flex h-full w-[78%] max-w-[320px] flex-col gap-8 bg-white opacity-100 px-6 py-8 shadow-2xl transition-transform duration-200 md:hidden isolate mix-blend-normal",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between">
          <span className="font-display text-lg font-semibold text-brand-950">
            Menú
          </span>
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setOpen(false)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-700 transition-colors duration-200 hover:border-brand-400 hover:text-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          >
            X
          </button>
        </div>

        <nav className="flex flex-col gap-4">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-2xl border border-transparent px-4 py-3 text-base font-semibold text-slate-700 transition-colors duration-200",
                  "hover:border-brand-300 hover:text-brand-900",
                  isActive && "border-brand-400 text-brand-950"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </header>
  );
}
