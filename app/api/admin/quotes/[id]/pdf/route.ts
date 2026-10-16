import { NextResponse } from "next/server";

import { getAdminFromCookies } from "@/lib/auth/admin";
import { canAccessQuote, getQuote } from "@/lib/quotes/db";
import { buildQuotePdfFileName, downloadQuotePdf, generateQuotePdf } from "@/lib/quotes/storage";

export const runtime = "nodejs";
export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> };

// Streams the stored PDF. Only reachable with an admin session.
export async function GET(_request: Request, { params }: RouteContext) {
  const admin = await getAdminFromCookies();
  if (!admin) {
    return NextResponse.json({ error: "Sesion no valida." }, { status: 401 });
  }

  const { id } = await params;
  const quote = await getQuote(id);
  if (!quote || !canAccessQuote(admin, quote)) {
    return NextResponse.json({ error: "Cotización no encontrada." }, { status: 404 });
  }

  let bytes: ArrayBuffer | null;
  try {
    bytes = await downloadQuotePdf(quote);
  } catch (error) {
    console.error("Quote PDF download failed", error);
    return NextResponse.json({ error: "No se pudo abrir el PDF." }, { status: 500 });
  }
  if (!bytes) {
    return NextResponse.json({ error: "PDF no generado aún." }, { status: 404 });
  }

  const fileName = buildQuotePdfFileName(quote.folio);
  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${fileName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

// Regenerates the PDF on demand (e.g. if the automatic one failed on save).
export async function POST(_request: Request, { params }: RouteContext) {
  const admin = await getAdminFromCookies();
  if (!admin) {
    return NextResponse.json({ error: "Sesion no valida." }, { status: 401 });
  }

  const { id } = await params;
  const quote = await getQuote(id);
  if (!quote || !canAccessQuote(admin, quote)) {
    return NextResponse.json({ error: "Cotización no encontrada." }, { status: 404 });
  }

  try {
    const withPdf = await generateQuotePdf(quote);
    return NextResponse.json({ quote: withPdf });
  } catch (error) {
    console.error("Quote PDF generation failed", error);
    return NextResponse.json({ error: "No se pudo generar el PDF." }, { status: 500 });
  }
}
