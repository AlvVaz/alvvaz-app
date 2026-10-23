import type { ReactNode } from "react";
import { cookies } from "next/headers";

import { Container } from "@/components/container";
import { AdminNav } from "@/app/admin/AdminNav";
import { ADMIN_SIDEBAR_COOKIE } from "@/lib/admin-sidebar";
import { getAdminFromCookies } from "@/lib/auth/admin";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await getAdminFromCookies();
  const cookieStore = await cookies();
  const sidebarCollapsed = cookieStore.get(ADMIN_SIDEBAR_COOKIE)?.value === "1";

  return (
    <div className="min-h-screen bg-sand md:flex">
      {admin ? <AdminNav role={admin.role} defaultCollapsed={sidebarCollapsed} /> : null}

      <main className="min-w-0 flex-1 py-10">
        <Container className="space-y-10">{children}</Container>
      </main>
    </div>
  );
}
