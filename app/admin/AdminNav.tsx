"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  ChartColumn,
  CreditCard,
  FileSignature,
  Megaphone,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Plane,
  ReceiptText,
  UserCog,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

import { ADMIN_SIDEBAR_COOKIE } from "@/lib/admin-sidebar";
import { useHideOnScroll } from "@/lib/use-hide-on-scroll";
import { cn } from "@/lib/utils";

type AdminRole = "owner" | "admin" | "tech";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  roles: AdminRole[];
};

const navItems: NavItem[] = [
  { label: "Clientes", href: "/admin/clients", icon: Users, roles: ["owner", "tech"] },
  { label: "Viajes", href: "/admin/viajes", icon: Plane, roles: ["owner", "tech"] },
  {
    label: "Contratos",
    href: "/admin/contratos",
    icon: FileSignature,
    roles: ["owner", "tech", "admin"],
  },
  {
    label: "Pagos",
    href: "/admin/pagos",
    icon: CreditCard,
    roles: ["owner", "tech", "admin"],
  },
  {
    label: "Cotizaciones",
    href: "/admin/cotizaciones",
    icon: ReceiptText,
    roles: ["owner", "tech", "admin"],
  },
  { label: "Analisis", href: "/admin/comisiones", icon: ChartColumn, roles: ["owner", "tech"] },
  {
    label: "Promociones",
    href: "/admin/promociones",
    icon: Megaphone,
    roles: ["owner", "tech"],
  },
  {
    label: "Revista",
    href: "/admin/magazine",
    icon: BookOpen,
    roles: ["owner", "tech", "admin"],
  },
];

const settingsItem = {
  label: "Configuración",
  href: "/admin/settings",
  icon: UserCog,
};

const roleLabels: Record<AdminRole, string> = {
  owner: "Owner",
  tech: "Tech",
  admin: "Admin",
};

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function isActivePath(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === href;
  }
  return pathname.startsWith(href);
}

function RoleBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full border border-brand-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
      {label}
    </span>
  );
}

type SidebarLinkProps = {
  label: string;
  href: string;
  icon: LucideIcon;
  isActive: boolean;
  isCollapsed: boolean;
  onPrefetch: (href: string) => void;
  onNavigate: () => void;
};

function SidebarLink({
  label,
  href,
  icon: Icon,
  isActive,
  isCollapsed,
  onPrefetch,
  onNavigate,
}: SidebarLinkProps) {
  return (
    <Link
      href={href}
      prefetch={false}
      onMouseEnter={() => onPrefetch(href)}
      onFocus={() => onPrefetch(href)}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        // Fixed px keeps the icon centered in the collapsed rail, so it never jumps.
        "group relative flex h-11 items-center gap-3 rounded-2xl px-[15px] text-xs font-semibold uppercase tracking-[0.2em] transition-colors duration-200",
        isActive
          ? "bg-brand-200/50 text-brand-700"
          : "text-slate-500 hover:bg-brand-200/30 hover:text-brand-700"
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute -left-3 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-brand-500 transition-all duration-200 motion-reduce:transition-none",
          isActive
            ? "scale-y-100 opacity-100"
            : "scale-y-0 opacity-0 group-hover:scale-y-100 group-hover:opacity-60"
        )}
      />
      <Icon
        aria-hidden="true"
        strokeWidth={1.75}
        className="h-[18px] w-[18px] shrink-0 transition-transform duration-200 ease-out group-hover:-rotate-6 group-hover:scale-115 motion-reduce:transition-none"
      />
      <span
        className={cn(
          "overflow-hidden whitespace-nowrap transition-all duration-200 ease-out group-hover:translate-x-1 motion-reduce:transition-none",
          isCollapsed ? "w-0 opacity-0" : "opacity-100"
        )}
      >
        {label}
      </span>
      {isCollapsed ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-full top-1/2 z-10 ml-4 -translate-y-1/2 translate-x-1 whitespace-nowrap rounded-full bg-brand-950 px-3 py-1.5 text-[11px] tracking-[0.15em] text-white opacity-0 shadow-lg transition-all duration-150 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100"
        >
          {label}
        </span>
      ) : null}
    </Link>
  );
}

export function AdminNav({
  role,
  defaultCollapsed = false,
}: {
  role?: AdminRole;
  defaultCollapsed?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const prefetchedRoutes = useRef(new Set<string>());
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  // Same hook as the site navbar: when it slides away, the sidebar moves up to the top.
  const navbarHidden = useHideOnScroll();
  const visibleItems = role
    ? navItems.filter((item) => item.roles.includes(role))
    : navItems;
  const roleLabel = role ? roleLabels[role] : null;
  const activeItem = pathname
    ? [...visibleItems, settingsItem].find((item) => isActivePath(pathname, item.href))
    : undefined;

  const prefetchRoute = (href: string) => {
    if (pathname === href) return;
    if (prefetchedRoutes.current.has(href)) return;
    prefetchedRoutes.current.add(href);
    router.prefetch(href);
  };

  const closeMobile = () => setMobileOpen(false);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    // Read by the admin layout so the first render already has the right width.
    document.cookie = `${ADMIN_SIDEBAR_COOKIE}=${next ? "1" : "0"}; path=/admin; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
  };

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  const renderLinks = (isCollapsed: boolean) => (
    <ul className="space-y-1">
      {visibleItems.map((item) => (
        <li key={item.href}>
          <SidebarLink
            {...item}
            isActive={activeItem?.href === item.href}
            isCollapsed={isCollapsed}
            onPrefetch={prefetchRoute}
            onNavigate={closeMobile}
          />
        </li>
      ))}
    </ul>
  );

  const renderFooter = (isCollapsed: boolean) => (
    <div className="space-y-3 border-t border-slate-200 px-3 py-4">
      {roleLabel && !isCollapsed ? (
        <div className="px-[15px]">
          <RoleBadge label={roleLabel} />
        </div>
      ) : null}
      <SidebarLink
        {...settingsItem}
        isActive={activeItem?.href === settingsItem.href}
        isCollapsed={isCollapsed}
        onPrefetch={prefetchRoute}
        onNavigate={closeMobile}
      />
    </div>
  );

  return (
    <>
      <div className="flex items-center gap-3 border-b border-slate-200 bg-white/90 px-6 py-3 md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menú"
          aria-expanded={mobileOpen}
          aria-controls="admin-mobile-nav"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-brand-700 transition-colors hover:border-brand-200 hover:bg-brand-200/30"
        >
          <Menu aria-hidden="true" className="h-5 w-5" />
        </button>
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
          {activeItem?.label ?? "Admin"}
        </span>
        {roleLabel ? (
          <span className="ml-auto">
            <RoleBadge label={roleLabel} />
          </span>
        ) : null}
      </div>

      <div
        className={cn("fixed inset-0 z-[60] md:hidden", !mobileOpen && "pointer-events-none")}
        inert={!mobileOpen}
      >
        <div
          aria-hidden="true"
          onClick={closeMobile}
          className={cn(
            "absolute inset-0 bg-brand-950/40 transition-opacity duration-300",
            mobileOpen ? "opacity-100" : "opacity-0"
          )}
        />
        <aside
          id="admin-mobile-nav"
          aria-label="Menú admin"
          className={cn(
            "absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-white shadow-2xl transition-transform duration-300 ease-out motion-reduce:transition-none",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex items-center justify-between px-6 pb-3 pt-5">
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-700">
              Menú
            </span>
            <button
              type="button"
              onClick={closeMobile}
              aria-label="Cerrar menú"
              className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-brand-200/30 hover:text-brand-700"
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </button>
          </div>
          <nav aria-label="Admin" className="flex-1 overflow-y-auto px-3 py-2">
            {renderLinks(false)}
          </nav>
          {renderFooter(false)}
        </aside>
      </div>

      <aside
        aria-label="Menú admin"
        className={cn(
          "sticky z-30 hidden shrink-0 flex-col border-r border-slate-200 bg-white/90 transition-[width,top,height] duration-300 ease-out motion-reduce:transition-none md:flex",
          collapsed ? "w-[4.5rem]" : "w-64",
          // Sits under the sticky site navbar (73px tall from md up) until it slides away.
          navbarHidden ? "top-0 h-dvh" : "top-[73px] h-[calc(100dvh-73px)]"
        )}
      >
        <div className="flex items-center justify-between px-3 pb-3 pt-5">
          <span
            className={cn(
              "overflow-hidden whitespace-nowrap text-xs font-semibold uppercase tracking-[0.3em] text-brand-700 transition-opacity duration-200",
              // Padding only when shown: a 0-width span would still keep it and push the toggle off center.
              collapsed ? "w-0 opacity-0" : "pl-[15px] opacity-100"
            )}
          >
            Menú
          </span>
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expandir menú" : "Contraer menú"}
            aria-expanded={!collapsed}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-slate-500 transition-colors hover:bg-brand-200/30 hover:text-brand-700"
          >
            {collapsed ? (
              <PanelLeftOpen aria-hidden="true" strokeWidth={1.75} className="h-5 w-5" />
            ) : (
              <PanelLeftClose aria-hidden="true" strokeWidth={1.75} className="h-5 w-5" />
            )}
          </button>
        </div>
        <nav
          aria-label="Admin"
          className={cn("flex-1 px-3 py-2", collapsed ? "overflow-visible" : "overflow-y-auto")}
        >
          {renderLinks(collapsed)}
        </nav>
        {renderFooter(collapsed)}
      </aside>
    </>
  );
}
