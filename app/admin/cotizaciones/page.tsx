import { redirect } from "next/navigation";

import { SectionHeading } from "@/components/section-heading";
import { getAdminFromCookies } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";
import { getNextQuoteFolio, listQuotes } from "@/lib/quotes/db";

import { QuotesList } from "./QuotesList";

export const dynamic = "force-dynamic";

export default async function CotizacionesAdminPage() {
  const admin = await getAdminFromCookies();
  if (!admin) {
    redirect("/admin/login");
  }

  const [quotes, currentAdmin, nextFolio] = await Promise.all([
    listQuotes(admin),
    prisma.adminUser.findUnique({
      where: { id: admin.sub },
      select: { username: true, email: true },
    }),
    getNextQuoteFolio(),
  ]);

  return (
    <div className="space-y-10">
      <SectionHeading
        kicker="Admin"
        title="Cotizaciones"
        subtitle="Crea cotizaciones, genera el PDF y compártelo."
      />
      <QuotesList
        initialQuotes={quotes}
        currentAdminName={currentAdmin?.username || currentAdmin?.email || admin.email}
        initialNextFolio={nextFolio}
      />
    </div>
  );
}
