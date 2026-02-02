import type { ReactNode } from "react";
import Link from "next/link";

import { Container } from "@/components/container";
import { buttonLinkStyles } from "@/components/ui/button";
import { AdminNav } from "@/app/admin/AdminNav";
import { getAdminFromCookies } from "@/lib/auth/admin";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await getAdminFromCookies();
  const roleLabel = admin?.role === "owner" ? "Owner" : admin ? "Admin" : null;

  return (
    <div className="min-h-screen bg-sand">
      <header className="border-b border-slate-200 bg-white/90">
        <Container className="flex items-center justify-between py-4">
          <div className="flex items-center gap-4">
            {admin ? <AdminNav /> : null}
          </div>
          <div className="flex items-center gap-3">
            {roleLabel ? (
              <span className="rounded-full border border-brand-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
                {roleLabel}
              </span>
            ) : null}
            {admin ? (
              <form action="/api/auth/logout" method="post">
                <button
                  type="submit"
                  className={buttonLinkStyles({ variant: "subtle" })}
                >
                  Salir
                </button>
              </form>
            ) : null}
            <Link href="/" className={buttonLinkStyles({ variant: "secondary" })}>
              Volver al sitio
            </Link>
          </div>
        </Container>
      </header>

      <main className="py-10">
        <Container className="space-y-10">{children}</Container>
      </main>
    </div>
  );
}
