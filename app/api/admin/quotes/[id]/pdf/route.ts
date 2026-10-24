import { NextResponse } from "next/server";

import { getAdminFromCookies } from "@/lib/auth/admin";
import { canAccessQuote, getQuote } from "@/lib/quotes/db";
import { downloadQuotePdf, generateQuotePdf } from "@/lib/quotes/storage";
import { buildQuotePdfFileName } from "@/lib/quotes/types";

export const runtime = "nodejs";
export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> };

// Headers only allow ASCII: browsers use the UTF-8 `filename*` (accents kept),
// older ones fall back to the plain `filename` ("Perez", and "AÑO" as "ANIO", not "ANO").
function contentDisposition(fileName: string) {
  const ascii = fileName
    .replace(/ñ/g, "ni")
    .replace(/Ñ/g, "NI")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/["\\]/g, "");
  const encoded = encodeURIComponent(fileName).replace(
    /['()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  );
  return `inline; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

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

  const fileName = buildQuotePdfFileName(quote.folio, quote.data);
  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": contentDisposition(fileName),
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
  // A borrador gets its PDF when it's saved for real (Guardar checks it first).
  if (quote.status === "draft") {
    return NextResponse.json({ error: "Guarda la cotización para generar el PDF." }, { status: 400 });
  }

  try {
    const withPdf = await generateQuotePdf(quote);
    return NextResponse.json({ quote: withPdf });
  } catch (error) {
    console.error("Quote PDF generation failed", error);
    return NextResponse.json({ error: "No se pudo generar el PDF." }, { status: 500 });
  }
}
