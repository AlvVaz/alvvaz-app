import Link from "next/link";
import { redirect } from "next/navigation";

import { SectionHeading } from "@/components/section-heading";
import { buttonLinkStyles } from "@/components/ui/button";
import { getAdminFromCookies } from "@/lib/auth/admin";

export default async function AdminPage() {
  const admin = await getAdminFromCookies();
  if (!admin) {
    redirect("/admin/login");
  }
  if (admin.role === "admin") {
    redirect("/admin/contratos");
  }

  return (
    <div className="space-y-8">
      <SectionHeading
        title="Panel interno"
        subtitle="Gestiona clientes, viajes, revista, promociones y contratos."
        kicker="Admin"
      />

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="font-display text-xl text-brand-950">Clientes</h3>
          <p className="mt-2 text-sm text-slate-600">
            Crea, edita y organiza viajeros. Agrega etiquetas para filtrar por
            presupuesto, tipo de viaje o temporada.
          </p>
          <Link
            href="/admin/clients"
            className={buttonLinkStyles({ variant: "primary", className: "mt-6" })}
          >
            Gestionar clientes
          </Link>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="font-display text-xl text-brand-950">Viajes</h3>
          <p className="mt-2 text-sm text-slate-600">
            Agenda próximos itinerarios, asigna asesor y lleva el control de
            pasajeros por salida.
          </p>
          <Link
            href="/admin/viajes"
            className={buttonLinkStyles({ variant: "primary", className: "mt-6" })}
          >
            Gestionar viajes
          </Link>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="font-display text-xl text-brand-950">Revista</h3>
          <p className="mt-2 text-sm text-slate-600">
            Publica nuevos catálogos digitales y adjunta PDFs o páginas visuales
            listas para compartir con clientes.
          </p>
          <Link
            href="/admin/magazine"
            className={buttonLinkStyles({ variant: "primary", className: "mt-6" })}
          >
            Gestionar revista
          </Link>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="font-display text-xl text-brand-950">Promociones</h3>
          <p className="mt-2 text-sm text-slate-600">
            Administra promociones destacadas, imágenes y enlaces para reservas
            en la web.
          </p>
          <Link
            href="/admin/promociones"
            className={buttonLinkStyles({ variant: "primary", className: "mt-6" })}
          >
            Gestionar promociones
          </Link>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="font-display text-xl text-brand-950">Contratos</h3>
          <p className="mt-2 text-sm text-slate-600">
            Genera contratos, controla pendientes de firma o pago y crea viajes
            automáticamente al aprobarlos.
          </p>
          <Link
            href="/admin/contratos"
            className={buttonLinkStyles({ variant: "primary", className: "mt-6" })}
          >
            Gestionar contratos
          </Link>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="font-display text-xl text-brand-950">Ajustes</h3>
          <p className="mt-2 text-sm text-slate-600">
            Administra usuarios del panel, actualiza tu perfil y configura
            accesos internos.
          </p>
          <Link
            href="/admin/settings"
            className={buttonLinkStyles({ variant: "primary", className: "mt-6" })}
          >
            Gestionar ajustes
          </Link>
        </div>
      </div>

      <div className="rounded-3xl border border-dashed border-brand-200 bg-white/60 p-6 text-sm text-slate-600">
        TODO: Conectar automatizaciones de WhatsApp, recordatorios y CRM interno
        una vez se defina el flujo de operación.
      </div>
    </div>
  );
}
