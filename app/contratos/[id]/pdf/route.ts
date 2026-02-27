import { NextResponse } from "next/server";

import { getContractById } from "@/lib/db";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const normalizePdfFilePart = (value: string) =>
  value
    .replace(/[\/:*?"<>|]/g, " ")
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

const toAsciiFileName = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/[\/:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const encodeRFC5987 = (value: string) =>
  encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);

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

  const fileBaseName = buildContractPdfBaseName(contract.title, contract.contractNumber, contract.id);
  const fileName = `${fileBaseName}.pdf`;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from(bucket)
    .download(storagePath);

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "No se pudo abrir el PDF." },
      { status: 500 }
    );
  }

  const bytes = await data.arrayBuffer();
  const asciiFileName = toAsciiFileName(fileName) || "CONTRATO.pdf";
  const encodedFileName = encodeRFC5987(fileName);

  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${asciiFileName}"; filename*=UTF-8''${encodedFileName}`,
      "Cache-Control": "private, no-store",
    },
  });
}
