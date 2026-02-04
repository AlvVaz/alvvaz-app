import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { readFile } from "node:fs/promises";
import path from "node:path";

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

const parseDate = (value?: string | null) => {
  if (!value) return "";
  const [year, month, day] = value.split("-").map((part) => Number(part));
  if (!year || !month || !day) return value;
  const months = [
    "ENERO",
    "FEBRERO",
    "MARZO",
    "ABRIL",
    "MAYO",
    "JUNIO",
    "JULIO",
    "AGOSTO",
    "SEPTIEMBRE",
    "OCTUBRE",
    "NOVIEMBRE",
    "DICIEMBRE",
  ];
  return `${day} DE ${months[month - 1]} ${year}`;
};

const parseDateShort = (value?: string | null) => {
  if (!value) return "";
  const [year, month, day] = value.split("-").map((part) => Number(part));
  if (!year || !month || !day) return value;
  const months = [
    "ENE",
    "FEB",
    "MAR",
    "ABR",
    "MAY",
    "JUN",
    "JUL",
    "AGO",
    "SEP",
    "OCT",
    "NOV",
    "DIC",
  ];
  return `${day} ${months[month - 1]} ${year}`;
};

const drawWrapped = (
  page: any,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  font: any,
  size: number,
  color: any,
  lineHeight = 1.2
) => {
  const lines = wrapText(text, maxWidth, font, size);
  let cursorY = y;
  for (const line of lines) {
    page.drawText(line, { x, y: cursorY, size, font, color });
    cursorY -= size * lineHeight;
  }
  return cursorY;
};

const drawWrappedTokens = (
  page: any,
  tokens: { text: string; bold: boolean }[],
  x: number,
  y: number,
  maxWidth: number,
  font: any,
  fontBold: any,
  size: number,
  color: any,
  boldColor: any,
  lineHeight = 1.2
) => {
  let lineTokens: { text: string; bold: boolean; width: number }[] = [];
  let lineWidth = 0;
  let cursorY = y;

  const flushLine = () => {
    let cursorX = x;
    lineTokens.forEach((token) => {
      const usedFont = token.bold ? fontBold : font;
      page.drawText(token.text, {
        x: cursorX,
        y: cursorY,
        size,
        font: usedFont,
        color: token.bold ? boldColor : color,
      });
      cursorX += token.width;
    });
    cursorY -= size * lineHeight;
    lineTokens = [];
    lineWidth = 0;
  };

  tokens.forEach((token) => {
    const usedFont = token.bold ? fontBold : font;
    const width = usedFont.widthOfTextAtSize(token.text, size);
    if (lineWidth + width > maxWidth && lineTokens.length) {
      flushLine();
    }
    lineTokens.push({ ...token, width });
    lineWidth += width;
  });

  if (lineTokens.length) {
    flushLine();
  }

  return cursorY;
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
  const loadFont = async (fileName: string, fallback: StandardFonts) => {
    try {
      const fontBytes = await readFile(path.join(process.cwd(), "public", "fonts", fileName));
      return await pdfDoc.embedFont(fontBytes);
    } catch {
      return await pdfDoc.embedFont(fallback);
    }
  };

  const headingFont = await loadFont("Montserrat-Regular.ttf", StandardFonts.Helvetica);
  const headingBold = await loadFont("Montserrat-Bold.ttf", StandardFonts.HelveticaBold);
  const bodyFont = await loadFont("Rubik-Regular.ttf", StandardFonts.Helvetica);
  const bodyBold = await loadFont("Rubik-Bold.ttf", StandardFonts.HelveticaBold);

  const margin = 38;
  const brand = {
    ink: rgb(0, 0, 0),
    muted: rgb(0.32, 0.32, 0.32),
    line: rgb(0.7, 0.7, 0.7),
    highlight: rgb(1, 1, 0.47), // #FFFF77
  };
  const headerTop = height - margin;
  const headerRightX = width - margin - 255;

  // Logo
  let logoBottomY = headerTop - 80;
  try {
    const logoPath = path.join(process.cwd(), "public", "logoalvvaz.png");
    const logoBytes = await readFile(logoPath);
    const logoImage = await pdfDoc.embedPng(logoBytes);
    const logoDims = logoImage.scale(0.16);
    logoBottomY = headerTop - logoDims.height;
    page.drawImage(logoImage, {
      x: margin + 6,
      y: logoBottomY,
      width: logoDims.width,
      height: logoDims.height,
    });
  } catch {
    // If logo isn't available, continue without it.
  }

  const titleText = (contract.title || "RESERVA DE VIAJE").toUpperCase();
  page.drawText(titleText, {
    x: headerRightX,
    y: headerTop - 18,
    size: 12,
    font: headingBold,
    color: brand.ink,
  });

  const contractLabel = "CONTRATO";
  const contractNumber = `#${contract.contractNumber ?? ""}`;
  const contractLabelSize = 11;
  const contractNumberSize = 11;
  const labelWidth = headingBold.widthOfTextAtSize(contractLabel, contractLabelSize);
  const numberWidth = headingBold.widthOfTextAtSize(contractNumber, contractNumberSize);
  const badgePaddingX = 4;
  const badgeHeight = 14;
  const badgeY = headerTop - 40;
  page.drawRectangle({
    x: headerRightX,
    y: badgeY - 2,
    width: labelWidth + badgePaddingX * 2,
    height: badgeHeight,
    color: brand.highlight,
  });
  page.drawText(contractLabel, {
    x: headerRightX + badgePaddingX,
    y: badgeY,
    size: contractLabelSize,
    font: headingBold,
    color: brand.ink,
  });
  page.drawText(contractNumber, {
    x: headerRightX + labelWidth + badgePaddingX * 2 + 6,
    y: badgeY,
    size: contractNumberSize,
    font: headingBold,
    color: brand.ink,
  });

  const headerInfoX = headerRightX;
  let headerInfoY = headerTop - 58;
  const headerLines = [
    `FECHA DE RESERVA: ${parseDate(contract.reservationDate)}`,
    "AGENCIA DE VIAJES ALVVAZ",
    "HERNAN CORTES #508-A COL. INDUSTRIAL AVIACION",
    `NOMBRE DEL CLIENTE: ${contract.clientName}`,
  ];
  headerLines.forEach((line, index) => {
    page.drawText(line, {
      x: headerInfoX,
      y: headerInfoY,
      size: index === 0 ? 8 : 7,
      font: index === 0 ? headingBold : headingFont,
      color: brand.ink,
    });
    headerInfoY -= index === 0 ? 11 : 9;
  });

  page.drawText("Mas de 9 Años nos Respalda!...", {
    x: margin + 6,
    y: logoBottomY - 18,
    size: 8,
    font: bodyFont,
    color: brand.muted,
  });

  let cursorY = headerTop - 150;

  // Vendor/Agency/Destination/Dates row
  const rowX = margin;
  const rowWidth = width - margin * 2;
  const rowHeight = 18;
  const rowLabelY = cursorY;
  const rowBoxTopY = rowLabelY - 6;
  const rowBoxBottomY = rowBoxTopY - rowHeight;
  const colWidths = [
    rowWidth * 0.24,
    rowWidth * 0.24,
    rowWidth * 0.26,
    rowWidth * 0.26,
  ];
  const colLabels = ["Vendedor", "AGENCIA", "DESTINO", "FECHAS DE VIAJE"];
  const colValues = [
    (contract.seller ?? contract.organizer ?? "").toUpperCase(),
    (contract.agency ?? "").toUpperCase(),
    contract.destination ?? "",
    [contract.departureDate, contract.returnDate]
      .filter(Boolean)
      .map((value) => parseDateShort(value))
      .join(" AL "),
  ];
  let labelX = rowX;
  colLabels.forEach((label, index) => {
    page.drawText(label, {
      x: labelX + 2,
      y: rowLabelY,
      size: 7,
      font: headingFont,
      color: brand.ink,
    });
    labelX += colWidths[index];
  });
  page.drawRectangle({
    x: rowX,
    y: rowBoxBottomY,
    width: rowWidth,
    height: rowHeight,
    borderWidth: 0.5,
    borderColor: brand.line,
  });
  let colX = rowX;
  colValues.forEach((value, index) => {
    const valueText = colValues[index] || "-";
    const maxTextWidth = colWidths[index] - 8;
    let valueSize = 8;
    while (
      valueSize > 6 &&
      headingBold.widthOfTextAtSize(valueText, valueSize) > maxTextWidth
    ) {
      valueSize -= 0.5;
    }
    page.drawText(valueText, {
      x: colX + 4,
      y: rowBoxBottomY + 5,
      size: valueSize,
      font: headingBold,
      color: brand.ink,
    });
    if (index < colValues.length - 1) {
      page.drawLine({
        start: { x: colX + colWidths[index], y: rowBoxTopY },
        end: { x: colX + colWidths[index], y: rowBoxBottomY },
        thickness: 0.5,
        color: brand.line,
      });
    }
    colX += colWidths[index];
  });

  cursorY = rowBoxBottomY - 26;

  // Description table
  const tableX = margin;
  const tableWidth = rowWidth;
  const tableHeaderHeight = 16;
  const tableRowHeight = 18;
  const tableCols = [tableWidth * 0.12, tableWidth * 0.62, tableWidth * 0.26];
  const tableHeaderBottomY = cursorY - tableHeaderHeight;
  const tableColumnEdges = [
    tableX + tableCols[0],
    tableX + tableCols[0] + tableCols[1],
  ];

  page.drawRectangle({
    x: tableX,
    y: tableHeaderBottomY,
    width: tableWidth,
    height: tableHeaderHeight,
    borderWidth: 0.5,
    borderColor: brand.line,
  });
  tableColumnEdges.forEach((edgeX) => {
    page.drawLine({
      start: { x: edgeX, y: cursorY },
      end: { x: edgeX, y: tableHeaderBottomY },
      thickness: 0.5,
      color: brand.line,
    });
  });

  const headerTextY = cursorY - 11;
  page.drawText("Cant.", {
    x: tableX + 4,
    y: headerTextY,
    size: 8,
    font: headingFont,
    color: brand.ink,
  });
  page.drawText("Descripción de lo contratado:", {
    x: tableX + tableCols[0] + 4,
    y: headerTextY,
    size: 8,
    font: headingFont,
    color: brand.ink,
  });
  page.drawText("COSTOS", {
    x: tableX + tableCols[0] + tableCols[1] + 4,
    y: headerTextY,
    size: 8,
    font: headingFont,
    color: brand.ink,
  });

  cursorY = tableHeaderBottomY;
  const descriptionLines = (contract.description ?? "")
    .split("\n")
    .filter(Boolean)
    .slice(0, 4);
  const total = formatMoney(contract.totalPrice ?? "");
  descriptionLines.forEach((line, index) => {
    const rowY = cursorY - tableRowHeight * index;
    page.drawRectangle({
      x: tableX,
      y: rowY - tableRowHeight,
      width: tableWidth,
      height: tableRowHeight,
      borderWidth: 0.5,
      borderColor: brand.line,
    });
    tableColumnEdges.forEach((edgeX) => {
      page.drawLine({
        start: { x: edgeX, y: rowY },
        end: { x: edgeX, y: rowY - tableRowHeight },
        thickness: 0.5,
        color: brand.line,
      });
    });
    const qtyMatch = line.match(/^(\d+)\s*[xX]\s*(.+)$/);
    const qty = qtyMatch ? qtyMatch[1] : "1";
    const details = qtyMatch ? qtyMatch[2] : line;
    page.drawText(qty, {
      x: tableX + 4,
      y: rowY - 12,
      size: 8,
      font: bodyFont,
      color: brand.ink,
    });
    const detailLines = wrapText(details, tableCols[1] - 8, bodyFont, 8);
    page.drawText(detailLines[0] ?? "", {
      x: tableX + tableCols[0] + 4,
      y: rowY - 12,
      size: 8,
      font: bodyFont,
      color: brand.ink,
    });
    if (index === 0 && total) {
      page.drawText(`$${total}`, {
        x: tableX + tableCols[0] + tableCols[1] + 6,
        y: rowY - 12,
        size: 8,
        font: bodyFont,
        color: brand.ink,
      });
    }
  });

  cursorY -= tableRowHeight * descriptionLines.length + 10;

  const notesText = contract.notes?.trim() || "";
  const notesLabel = "NOTAS";
  page.drawText(notesLabel, {
    x: tableX,
    y: cursorY,
    size: 8,
    font: headingFont,
    color: brand.ink,
  });
  cursorY -= 10;
  const notesWidth = tableWidth;
  const notesLines = notesText
    ? wrapText(notesText, notesWidth - 10, bodyFont, 8)
    : [""];
  const notesHeight = Math.max(32, notesLines.length * 9 + 8);
  page.drawRectangle({
    x: tableX,
    y: cursorY - notesHeight,
    width: notesWidth,
    height: notesHeight,
    borderWidth: 0.5,
    borderColor: brand.line,
  });
  let notesY = cursorY - 14;
  notesLines.forEach((line) => {
    page.drawText(line, {
      x: tableX + 4,
      y: notesY,
      size: 8,
      font: bodyFont,
      color: brand.ink,
    });
    notesY -= 9;
  });
  cursorY -= notesHeight + 14;

  const liquidationText = `LIQUIDACION DEL VIAJE: ${parseDate(contract.liquidationDate) || "-"}`;
  page.drawText(liquidationText, {
    x: tableX + 140,
    y: cursorY,
    size: 8,
    font: headingFont,
    color: brand.ink,
  });

  const costBoxX = tableX + tableWidth * 0.7;
  const costBoxY = cursorY + 4;
  const costBoxWidth = tableWidth * 0.3;
  const costBoxHeight = 48;
  page.drawRectangle({
    x: costBoxX,
    y: costBoxY - costBoxHeight,
    width: costBoxWidth,
    height: costBoxHeight,
    borderWidth: 0.5,
    borderColor: brand.line,
  });
  const first = formatMoney(contract.firstPayment ?? "");
  const balance = formatMoney(contract.balanceDue ?? "");
  const costLines = [
    ["PRECIO NETO:", total ? `$${total}` : "MXN"],
    ["PRIMER PAGO:", first ? `$${first}` : "MXN"],
    ["RESTO POR PAGAR:", balance ? `$${balance}` : "MXN"],
  ];
  costLines.forEach((line, index) => {
    const lineY = costBoxY - 12 - index * 14;
    page.drawText(line[0], {
      x: costBoxX + 6,
      y: lineY,
      size: 7,
      font: headingFont,
      color: brand.ink,
    });
    page.drawText(line[1], {
      x: costBoxX + costBoxWidth - 50,
      y: lineY,
      size: 7,
      font: bodyFont,
      color: brand.ink,
    });
  });

  cursorY -= 70;

  const consultaText = "CONSULTA PLAN DE PAGOS PARA LA LIQUIDACION DE TU RESERVA";
  const consultaWidth = headingFont.widthOfTextAtSize(consultaText, 7);
  page.drawText(consultaText, {
    x: (width - consultaWidth) / 2,
    y: cursorY,
    size: 7,
    font: headingFont,
    color: brand.muted,
  });
  cursorY -= 14;
  const graciasText = "Gracias por tu confianza.";
  const graciasWidth = headingBold.widthOfTextAtSize(graciasText, 8);
  page.drawText(graciasText, {
    x: (width - graciasWidth) / 2,
    y: cursorY,
    size: 8,
    font: headingBold,
    color: brand.ink,
  });

  cursorY -= 30;
  const policyTitle = "POLITICAS GENERALES:";
  const policyTitleWidth = headingFont.widthOfTextAtSize(policyTitle, 8);
  page.drawText(policyTitle, {
    x: (width - policyTitleWidth) / 2,
    y: cursorY,
    size: 8,
    font: headingFont,
    color: brand.muted,
  });

  cursorY -= 12;
  const policies = [
    { text: "PRIMER ANTICIPO ES NO REEMBOLSABLE, ENDOSABLE O TRANSFERIBLE A CUALQUIER OTRO PRODUCTO", level: 0 },
    { text: "REALIZAR LOS PAGOS CONFORME AL CALENDARIO DE PAGOS, LA OMISION PUEDE OCASIONAR AJUSTES TARIFARIOS O CANCELACIONES EN LOS SERVICIOS DESCRITOS.", level: 0 },
    { text: "AGENCIA ALVVAZ ASI COMO SU TITULAR NO SE HACEN RESPONSABLES EN CANCELACIONES NO PLANEADAS POR CONDICIONES CLIMATOLOGICAS, CIERRES DE VIALIDADES O ALGUNA OTRA SITUACION AJENA A NOSOTROS COMO EMPRESA, SIN EMBARGO SIEMPRE TENDRAN EL RESPALDO POR PARTE NUESTRA, PARA BUSCAR UNA SOLUCION.", level: 0 },
    { text: "VUELOS Y SERVICIOS AEREOS, NO SON REEMBOLSABLES POR NINGUN MOTIVO, CUALQUIER MODIFICACION EN NOMBRE, FECHA, RUTA ETC... SERA SUJETO A DISPONIBILIDAD Y ACEPTACION POR LA AEROLINEA PROVEEDORA DEL SERVICIO, TODA MODIFICACION A SU ITINERARIO POR PARTE DE LA AEROLINEA, RETRASO O CANCELACIONES EN EL MISMO DIA DE VUELO SERAN CONSULTADAS POR EL PASAJERO DIRECTO CON LA AEROLINEA EN MOSTRADOR, DESLINDANDO A LA AGENCIA POR PERDIDA DE SERVICIOS SUBSECUENTES AL VUELO, SIN EMBARGO SIEMPRE TENDRAN EL RESPALDO POR PARTE NUESTRA, PARA BUSCAR UNA SOLUCION.", level: 0 },
    { text: "LA INFORMACION PROPORCIONADA POR EL CLIENTE QUE CONTRATA DECLARA SER VERIDICA Y CONFIRMABLE, EN CASO DE LAS EDADES DE MENORES A LA LLEGADA AL HOTEL, DEBE SER LA MISMA QUE SE DECLARO AL HACER LA RESERVA.", level: 0 },
    { text: "EL TEMA DE CANCELACIONES DE HOTELERIA:", level: 0 },
    { text: "SI CANCELAS 270 A 300 DIAS ANTES DE TU VIAJE LA PENALIDAD APLICABLE ES DEL 10% SOBRE EL TOTAL DEL VIAJE CONTRATADO", level: 1 },
    { text: "SI CANCELAS DE 180 A 269 ANTES DE TU VIAJE LA PENALIDAD APLICABLE ES DEL 30% SOBRE EL TOTAL DEL VIAJE CONTRATADO", level: 1 },
    { text: "SI CANCELAS DE 46 A 179 DIAS ANTES DE TU VIAJE LA PENALIDAD APLICABLE ES DE 55% SOBRE EL TOTAL DEL VIAJE CONTRATADO", level: 1 },
    { text: "SI CANCELAS DE 16 A 45 DIAS ANTES DE TU VIAJE LA PENALIDAD APLICABLE ES DE 85% SOBRE EL TOTAL DEL VIAJE CONTRATADO", level: 1 },
    { text: "TODA RESERVA CANCELADA 15 A 0 DIAS ANTES DEL VIAJE APLICA LA PENALIDAD DEL 100% SOBRE EL TOTAL DEL VIAJE CONTRATADO", level: 1 },
    { text: "AL SER FIRMADO ESTE DOCUMENTO POR EL CLIENTE, ACEPTA HABER LEIDO Y ESTAR CONFORME CON LAS POLITICAS.", level: 0 },
  ];

  const policyLineHeight = 1.35;
  const policyGap = 5;
  const policySubGap = 2;
  policies.forEach((policy) => {
    const bullet = policy.level === 0 ? "•" : "";
    const bulletIndent = policy.level === 0 ? 12 : 26;
    const bulletMaxWidth = width - margin * 2 - bulletIndent;
    if (bullet) {
      page.drawText(bullet, {
        x: margin + 2,
        y: cursorY,
        size: 6.5,
        font: bodyFont,
        color: brand.muted,
      });
    }
    cursorY = drawWrapped(
      page,
      policy.text,
      margin + bulletIndent,
      cursorY,
      bulletMaxWidth,
      bodyFont,
      6.5,
      brand.muted,
      policyLineHeight
    );
    cursorY -= policy.level === 0 ? policyGap : policySubGap;
  });

  cursorY -= 6;
  const addressLine =
    "HERNAN CORTES #508-A COL. INDUSTRIAL AVIACION / CALLE 30 #689 VILLAS DEL SOL";
  const addressWidth = headingBold.widthOfTextAtSize(addressLine, 7);
  page.drawText(addressLine, {
    x: (width - addressWidth) / 2,
    y: cursorY,
    size: 7,
    font: headingBold,
    color: brand.muted,
  });
  cursorY -= 16;
  const firmaLine = "FIRMA:______________________________ AGENCIA ALVVAZ";
  const firmaWidth = bodyFont.widthOfTextAtSize(firmaLine, 7);
  page.drawText(firmaLine, {
    x: (width - firmaWidth) / 2,
    y: cursorY,
    size: 7,
    font: bodyFont,
    color: brand.muted,
  });

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
