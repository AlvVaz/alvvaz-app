import { NextResponse } from "next/server";

import { getAdminFromCookies } from "@/lib/auth/admin";
import { createQuote, getAdminDisplayName, listQuotes } from "@/lib/quotes/db";
import { generateQuotePdf } from "@/lib/quotes/storage";
import { parseQuoteData } from "@/lib/quotes/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const admin = await getAdminFromCookies();
  if (!admin) {
    return NextResponse.json({ error: "Sesion no valida." }, { status: 401 });
  }

  const search = new URL(request.url).searchParams.get("search") ?? "";
  const quotes = await listQuotes(admin, search);
  return NextResponse.json({ quotes });
}

export async function POST(request: Request) {
  const admin = await getAdminFromCookies();
  if (!admin) {
    return NextResponse.json({ error: "Sesion no valida." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const data = parseQuoteData(body?.data);
  if (!data.clientName.trim() || !data.hotelName.trim()) {
    return NextResponse.json(
      { error: "El cliente y el hotel son obligatorios." },
      { status: 400 }
    );
  }

  // Vendedor always comes from the session, never from the request body.
  data.vendorName = (await getAdminDisplayName(admin.sub)) ?? admin.email;

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
