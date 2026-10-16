import { setQuotePdf } from "@/lib/quotes/db";
import { renderQuotePdf } from "@/lib/quotes/render-pdf";
import type { QuoteRecord } from "@/lib/quotes/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export function getQuotesBucket() {
  return process.env.SUPABASE_STORAGE_BUCKET_QUOTES || "quotes";
}

export function buildQuotePdfFileName(folio: number) {
  return `COTIZACION-#${folio}.pdf`;
}

// Renders the quote, uploads it (overwriting the previous file) and stores the path.
export async function generateQuotePdf(quote: QuoteRecord) {
  const pdfBytes = await renderQuotePdf(quote.data, String(quote.folio));
  const bucket = getQuotesBucket();
  const storagePath = `${quote.id}/COTIZACION-${quote.folio}.pdf`;

  const { error } = await getSupabaseAdmin()
    .storage.from(bucket)
    .upload(storagePath, pdfBytes, { contentType: "application/pdf", upsert: true });
  if (error) {
    throw new Error(error.message);
  }

  return setQuotePdf(quote.id, bucket, storagePath);
}

export async function downloadQuotePdf(quote: QuoteRecord) {
  if (!quote.storagePath) return null;
  const { data, error } = await getSupabaseAdmin()
    .storage.from(quote.storageBucket || getQuotesBucket())
    .download(quote.storagePath);
  if (error || !data) {
    throw new Error(error?.message ?? "No se pudo descargar el PDF.");
  }
  return data.arrayBuffer();
}

export async function removeQuotePdf(quote: QuoteRecord) {
  if (!quote.storagePath) return;
  const { error } = await getSupabaseAdmin()
    .storage.from(quote.storageBucket || getQuotesBucket())
    .remove([quote.storagePath]);
  if (error) {
    throw new Error(error.message);
  }
}
