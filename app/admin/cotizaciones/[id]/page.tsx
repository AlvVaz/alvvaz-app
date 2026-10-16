import { notFound, redirect } from "next/navigation";

import { getAdminFromCookies } from "@/lib/auth/admin";
import { canAccessQuote, getQuote } from "@/lib/quotes/db";

import { QuoteEditor } from "../QuoteEditor";

export const dynamic = "force-dynamic";

export default async function EditarCotizacionPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminFromCookies();
  if (!admin) {
    redirect("/admin/login");
  }

  const { id } = await params;
  const quote = await getQuote(id);
  if (!quote || !canAccessQuote(admin, quote)) {
    notFound();
  }

  return <QuoteEditor key={quote.id} initialQuote={quote} />;
}
