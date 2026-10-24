import { NextResponse } from "next/server";

import { getAdminFromCookies } from "@/lib/auth/admin";
import { createDraftQuote, createQuote, getAdminDisplayName, listQuotes, resolveQuoteVendor } from "@/lib/quotes/db";
import { generateQuotePdf } from "@/lib/quotes/storage";
import { getQuoteSaveError, parseQuoteData } from "@/lib/quotes/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const admin = await getAdminFromCookies();
  if (!admin) {
    return NextResponse.json({ error: "Sesion no valida." }, { status: 401 });
  }

  const query = new URL(request.url).searchParams;
  const search = query.get("search") ?? "";
  const page = Number.parseInt(query.get("page") ?? "1", 10) || 1;
  // { quotes, total, page }: one page of 20 (QUOTE_PAGE_SIZE).
  return NextResponse.json(await listQuotes(admin, search, page));
}

export async function POST(request: Request) {
  const admin = await getAdminFromCookies();
  if (!admin) {
    return NextResponse.json({ error: "Sesion no valida." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const data = parseQuoteData(body?.data);
  // Autosave of a new quote: saved as a borrador as it is, without checks or PDF.
  const isDraft = body?.draft === true;
  const saveError = isDraft ? null : getQuoteSaveError(data);
  if (saveError) {
    return NextResponse.json({ error: saveError }, { status: 400 });
  }

  // Vendedor is the creator from the session; only owner/tech may pick another admin.
  data.vendorName = await resolveQuoteVendor(
    admin,
    data.vendorName,
    async () => (await getAdminDisplayName(admin.sub)) ?? admin.email
  );

  if (isDraft) {
    return NextResponse.json({ quote: await createDraftQuote(data, admin.sub) });
  }

  const quote = await createQuote(data, admin.sub);

  // The PDF is regenerated on every save; a failure keeps the saved quote.
  try {
    const withPdf = await generateQuotePdf(quote);
    return NextResponse.json({ quote: withPdf });
  } catch (error) {
    console.error("Quote PDF generation failed", error);
    return NextResponse.json({ quote, pdfError: "Se guardó, pero no se pudo generar el PDF." });
  }
}
