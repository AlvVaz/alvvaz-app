"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type AdminRole = "owner" | "admin" | "tech";

const navItems = [
  { label: "Resumen", href: "/admin", roles: ["owner", "tech"] },
  { label: "Clientes", href: "/admin/clients", roles: ["owner", "tech"] },
  { label: "Viajes", href: "/admin/viajes", roles: ["owner", "tech"] },
  {
    label: "Contratos",
    href: "/admin/contratos",
    roles: ["owner", "tech", "admin"],
  },
  {
    label: "Pagos",
    href: "/admin/pagos",
    roles: ["owner", "tech", "admin"],
  },
  { label: "Analisis", href: "/admin/comisiones", roles: ["owner", "tech"] },
  {
    label: "Promociones",
    href: "/admin/promociones",
    roles: ["owner", "tech"],
  },
  { label: "Revista", href: "/admin/magazine", roles: ["owner", "tech", "admin"] },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === href;
  }
  return pathname.startsWith(href);
}

export function AdminNav({ role }: { role?: AdminRole }) {
  const pathname = usePathname();
  const visibleItems = role
    ? navItems.filter((item) => item.roles.includes(role))
    : navItems;

  return (
    <nav className="hidden items-center gap-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 md:flex">
      {visibleItems.map((item) => {
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
