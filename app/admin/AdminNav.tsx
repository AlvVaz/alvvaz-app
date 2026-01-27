"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Resumen", href: "/admin" },
  { label: "Clientes", href: "/admin/clients" },
  { label: "Viajes", href: "/admin/viajes" },
  { label: "Revista", href: "/admin/magazine" },
  { label: "Contratos", href: "/admin/contratos" },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === href;
  }
  return pathname.startsWith(href);
}

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 md:flex">
      {navItems.map((item) => {
        const isActive = pathname ? isActivePath(pathname, item.href) : false;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={[
              "rounded-full px-3 py-1 transition-colors hover:text-brand-700",
              isActive ? "text-brand-700 ring-1 ring-brand-500/80" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
