import { NextResponse } from "next/server";

import { getAdminFromCookies } from "@/lib/auth/admin";
import {
  canAccessQuote,
  deleteQuote,
  discardQuoteDraft,
  getAdminDisplayName,
  getQuote,
  resolveQuoteVendor,
  saveQuoteDraft,
  updateQuote,
} from "@/lib/quotes/db";
import { generateQuotePdf, removeQuotePdf } from "@/lib/quotes/storage";
import { getQuoteSaveError, parseQuoteData } from "@/lib/quotes/types";

export const runtime = "nodejs";
export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> };

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
  return NextResponse.json({ quote });
}

export async function PUT(request: Request, { params }: RouteContext) {
  const admin = await getAdminFromCookies();
  if (!admin) {
    return NextResponse.json({ error: "Sesion no valida." }, { status: 401 });
  }

  const { id } = await params;
  const existing = await getQuote(id);
  if (!existing || !canAccessQuote(admin, existing)) {
    return NextResponse.json({ error: "Cotización no encontrada." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);

  // "Descartar borrador" on a saved quote: back to its last saved version.
  if (body?.discardDraft === true) {
    return NextResponse.json({ quote: await discardQuoteDraft(existing) });
  }

  const data = parseQuoteData(body?.data);
  // Autosave: kept as a borrador as it is, without checks or PDF (see saveQuoteDraft).
  const isDraft = body?.draft === true;
  const saveError = isDraft ? null : getQuoteSaveError(data);
  if (saveError) {
    return NextResponse.json({ error: saveError }, { status: 400 });
  }

  // Vendedor keeps its saved value (the creator, or the admin an owner/tech picked);
  // only owner/tech may change it.
  data.vendorName = await resolveQuoteVendor(
    admin,
    data.vendorName,
    async () =>
      existing.data.vendorName ||
      ((existing.createdById ? await getAdminDisplayName(existing.createdById) : null) ?? "")
  );

  if (isDraft) {
    return NextResponse.json({ quote: await saveQuoteDraft(existing, data) });
  }

  const quote = await updateQuote(id, data);

  try {
    const withPdf = await generateQuotePdf(quote);
    return NextResponse.json({ quote: withPdf });
  } catch (error) {
    console.error("Quote PDF generation failed", error);
    return NextResponse.json({
      quote,
      pdfError: "Se guardó, pero no se pudo actualizar el PDF.",
    });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
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
    await removeQuotePdf(quote);
  } catch (error) {
    console.error("Quote PDF removal failed", error);
    return NextResponse.json({ error: "No se pudo eliminar el PDF." }, { status: 500 });
  }

  await deleteQuote(id);
  return NextResponse.json({ ok: true });
}
