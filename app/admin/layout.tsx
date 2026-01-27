import type { ReactNode } from "react";
import Link from "next/link";

import { Container } from "@/components/container";
import { buttonLinkStyles } from "@/components/ui/button";
import { AdminNav } from "@/app/admin/AdminNav";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-sand">
      <header className="border-b border-slate-200 bg-white/90">
        <Container className="flex items-center justify-between py-4">
          <div className="flex items-center gap-4">
            <AdminNav />
          </div>
          <Link href="/" className={buttonLinkStyles({ variant: "secondary" })}>
            Volver al sitio
          </Link>
        </Container>
      </header>

      <main className="py-10">
        <Container className="space-y-10">{children}</Container>
      </main>
    </div>
  );
}
