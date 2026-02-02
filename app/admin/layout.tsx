import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";

import { Container } from "@/components/container";
import { buttonLinkStyles } from "@/components/ui/button";
import { AdminNav } from "@/app/admin/AdminNav";
import { getAdminFromCookies } from "@/lib/auth/admin";
import { LogoutOnClose } from "@/app/admin/LogoutOnClose";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await getAdminFromCookies();
  const roleLabel = admin
    ? admin.role === "owner"
      ? "Owner"
      : admin.role === "tech"
      ? "Tech"
      : "Admin"
    : null;

  return (
    <div className="min-h-screen bg-sand">
      <header className="border-b border-slate-200 bg-white/90">
        <Container className="flex items-center justify-between py-4">
          <div className="flex items-center gap-4">
            {admin ? <AdminNav /> : null}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            {roleLabel ? (
              <span className="inline-flex shrink-0 items-center rounded-full border border-brand-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
                {roleLabel}
              </span>
            ) : null}
            {admin ? <LogoutOnClose /> : null}
            {admin ? (
              <Link href="/admin/settings" aria-label="Configuración">
                <Image
                  src="/profile.png"
                  alt="Perfil"
                  width={20}
                  height={20}
                  className="h-5 w-5 object-contain"
                />
              </Link>
            ) : null}
          </div>
        </Container>
      </header>

      <main className="py-10">
        <Container className="space-y-10">{children}</Container>
      </main>
    </div>
  );
}
