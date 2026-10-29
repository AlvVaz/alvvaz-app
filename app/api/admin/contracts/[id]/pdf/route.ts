import { NextResponse } from "next/server";

import { renderContractPdf } from "@/lib/contracts/render-pdf";
import { getContractById, updateContract } from "@/lib/db";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
// Headless Chrome render (cold start + PDF), same limit as the quote PDFs.
export const maxDuration = 60;

const normalizePdfFilePart = (value: string) =>
  value
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const buildContractPdfBaseName = (
  title: string | null | undefined,
  contractNumber: string | null | undefined,
  fallbackId: string
) => {
  const normalizedTitle = normalizePdfFilePart((title ?? "CONTRATO").toUpperCase()) || "CONTRATO";
  const rawNumber = normalizePdfFilePart((contractNumber ?? fallbackId ?? "").toUpperCase()).replace(/^#+/, "");
  return rawNumber ? `${normalizedTitle}-#${rawNumber}` : normalizedTitle;
};

// Supabase Storage rejects non-ASCII keys (e.g. Ñ, accents); display names keep them.
const toAsciiStorageKeyPart = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim();

export async function POST(
  request: Request,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  const resolvedParams = await Promise.resolve(params);
  const id = resolvedParams?.id;
  if (!id) {
    return NextResponse.json({ error: "Falta el id del contrato." }, { status: 400 });
  }

  const contract = await getContractById(id);
  if (!contract) {
    return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 });
  }

  // Same design as design/contrato-reserva/contrato.html (see lib/contracts/render-pdf.ts).
  const pdfBytes = await renderContractPdf(contract);

  const supabase = getSupabaseAdmin();
  const bucket = process.env.SUPABASE_STORAGE_BUCKET_CONTRACTS || "contracts";
  const pdfBaseName = buildContractPdfBaseName(contract.title, contract.contractNumber, contract.id);
  const storagePath = `${contract.id}/${toAsciiStorageKeyPart(pdfBaseName) || "CONTRATO"}.pdf`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(storagePath, pdfBytes, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(storagePath);
  const fileUrl = publicUrlData?.publicUrl ?? "";

  await updateContract(contract.id, {
    fileUrl,
    storageBucket: bucket,
    storagePath,
    mimeType: "application/pdf",
    size: pdfBytes.length,
    metadata: {
      ...contract.metadata,
      generatedAt: new Date().toISOString(),
    },
  });

  return NextResponse.json({ fileUrl, storagePath });
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  const resolvedParams = await Promise.resolve(params);
  const id = resolvedParams?.id;
  if (!id) {
    return NextResponse.json({ error: "Falta el id del contrato." }, { status: 400 });
  }

  const contract = await getContractById(id);
  if (!contract) {
    return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 });
  }

  const storagePath = contract.storagePath;
  const bucket =
    contract.storageBucket ||
    process.env.SUPABASE_STORAGE_BUCKET_CONTRACTS ||
    "contracts";

  if (!storagePath) {
    return NextResponse.json({ error: "PDF no generado a\u00fan." }, { status: 404 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(storagePath, 60 * 60 * 24 * 7);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: error?.message ?? "No se pudo abrir el PDF." }, { status: 500 });
  }

  return NextResponse.json({ signedUrl: data.signedUrl });
}

















