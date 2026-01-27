import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import { getContractById, updateContract } from "@/lib/db";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const formatMoney = (value: string | null) => {
  if (!value) return "";
  const cleaned = value.replace(/[^\d.-]/g, "");
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) return value;
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(parsed);
};

const wrapText = (text: string, maxWidth: number, font: any, size: number) => {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    const width = font.widthOfTextAtSize(test, size);
    if (width <= maxWidth) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
};

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

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 portrait
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const margin = 48;
  let y = height - margin;

  const drawLabel = (label: string, value: string) => {
    page.drawText(label, {
      x: margin,
      y,
      size: 9,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= 14;
    page.drawText(value || "-", {
      x: margin,
      y,
      size: 11,
      font,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= 18;
  };

  page.drawText("Contrato de viaje", {
    x: margin,
    y,
    size: 16,
    font: fontBold,
    color: rgb(0.05, 0.1, 0.2),
  });
  y -= 28;

  drawLabel("Contrato", contract.title);
  drawLabel("Número de contrato", contract.contractNumber ?? "");
  drawLabel("Fecha de reserva", contract.reservationDate ?? "");
  drawLabel("Cliente", contract.clientName ?? "");
  drawLabel("Destino", contract.destination ?? "");
  drawLabel("Hotel", contract.hotel ?? "");
  drawLabel("Fechas de viaje", [contract.departureDate, contract.returnDate].filter(Boolean).join(" - "));

  const description = contract.description ?? "";
  if (description) {
    page.drawText("Descripción de lo contratado", {
      x: margin,
      y,
      size: 9,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= 14;
    const lines = wrapText(description, width - margin * 2, font, 11);
    for (const line of lines) {
      page.drawText(line, { x: margin, y, size: 11, font, color: rgb(0.1, 0.1, 0.1) });
      y -= 14;
      if (y < margin + 100) break;
    }
    y -= 8;
  }

  const total = formatMoney(contract.totalPrice ?? "");
  const first = formatMoney(contract.firstPayment ?? "");
  const balance = formatMoney(contract.balanceDue ?? "");
  page.drawText("Costos", {
    x: margin,
    y,
    size: 9,
    font: fontBold,
    color: rgb(0.2, 0.2, 0.2),
  });
  y -= 14;
  page.drawText(`Precio neto: MXN ${total}`, { x: margin, y, size: 11, font });
  y -= 14;
  page.drawText(`Primer pago: MXN ${first}`, { x: margin, y, size: 11, font });
  y -= 14;
  page.drawText(`Resto por pagar: MXN ${balance}`, { x: margin, y, size: 11, font });

  const pdfBytes = await pdfDoc.save();

  const supabase = getSupabaseAdmin();
  const bucket = process.env.SUPABASE_STORAGE_BUCKET_CONTRACTS || "contracts";
  const safeNumber = (contract.contractNumber || contract.id).replace(/[^a-zA-Z0-9-_]/g, "-");
  const storagePath = `${contract.id}/contrato-${safeNumber}.pdf`;

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
    return NextResponse.json({ error: "PDF no generado aún." }, { status: 404 });
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
