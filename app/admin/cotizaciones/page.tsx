import { redirect } from "next/navigation";

import { SectionHeading } from "@/components/section-heading";
import { getAdminFromCookies } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";
import {
  canChooseQuoteVendor,
  getNextQuoteFolio,
  latestQuotesByKind,
  listQuoteVendorChoices,
  listQuotes,
} from "@/lib/quotes/db";

import { QuotesList } from "./QuotesList";

export const dynamic = "force-dynamic";

export default async function CotizacionesAdminPage() {
  const admin = await getAdminFromCookies();
  if (!admin) {
    redirect("/admin/login");
  }

  const [firstPage, latestByKind, currentAdmin, nextFolio, vendorOptions] = await Promise.all([
    listQuotes(admin),
    latestQuotesByKind(admin),
    prisma.adminUser.findUnique({
      where: { id: admin.sub },
      select: { username: true, email: true },
    }),
    getNextQuoteFolio(),
    canChooseQuoteVendor(admin) ? listQuoteVendorChoices() : undefined,
  ]);

  return (
    <div className="space-y-10">
      <SectionHeading
        kicker="Admin"
        title="Cotizaciones"
        subtitle="Crea cotizaciones, genera el PDF y compártelo."
      />
      <QuotesList
        initialPage={firstPage}
        initialLatestByKind={latestByKind}
        currentAdminName={currentAdmin?.username || currentAdmin?.email || admin.email}
        initialNextFolio={nextFolio}
        vendorOptions={vendorOptions}
      />
    </div>
  );
}
