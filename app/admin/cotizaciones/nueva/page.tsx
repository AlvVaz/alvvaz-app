import { redirect } from "next/navigation";

import { getAdminFromCookies } from "@/lib/auth/admin";
import {
  canChooseQuoteVendor,
  getAdminDisplayName,
  getNextQuoteFolio,
  listQuoteVendorChoices,
} from "@/lib/quotes/db";

import { QuoteEditor } from "../QuoteEditor";

export const dynamic = "force-dynamic";

export default async function NuevaCotizacionPage() {
  const admin = await getAdminFromCookies();
  if (!admin) {
    redirect("/admin/login");
  }

  const [adminName, nextFolio, vendorOptions] = await Promise.all([
    getAdminDisplayName(admin.sub),
    getNextQuoteFolio(),
    canChooseQuoteVendor(admin) ? listQuoteVendorChoices() : undefined,
  ]);

  return (
    <QuoteEditor
      initialQuote={null}
      currentAdminName={adminName ?? admin.email}
      nextFolio={nextFolio}
      vendorOptions={vendorOptions}
    />
  );
}
