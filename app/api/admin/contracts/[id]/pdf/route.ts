import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
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
  const isWhole = Math.abs(parsed - Math.trunc(parsed)) < 0.005;
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: isWhole ? 0 : 2,
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

const shortMonths = [
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

const parseDateParts = (value?: string | null) => {
  if (!value) return null;
  const [year, month, day] = value.split("-").map((part) => Number(part));
  if (!year || !month || !day) return null;
  if (month < 1 || month > 12) return null;
  return { year, month, day };
};

const formatDateShort = (value?: string | null) => {
  const parts = parseDateParts(value);
  if (!parts) return value ?? "";
  return `${parts.day} ${shortMonths[parts.month - 1]} ${parts.year}`;
};

const formatDateRangeShort = (start?: string | null, end?: string | null) => {
  const startParts = parseDateParts(start);
  const endParts = parseDateParts(end);

  if (startParts && endParts) {
    if (startParts.year === endParts.year && startParts.month === endParts.month) {
      if (startParts.day === endParts.day) {
        return `${startParts.day} ${shortMonths[startParts.month - 1]} ${startParts.year}`;
      }
      return `${startParts.day} AL ${endParts.day} ${shortMonths[startParts.month - 1]} ${startParts.year}`;
    }
    if (startParts.year === endParts.year) {
      return `${startParts.day} ${shortMonths[startParts.month - 1]} AL ${endParts.day} ${
        shortMonths[endParts.month - 1]
      } ${startParts.year}`;
    }
    return `${startParts.day} ${shortMonths[startParts.month - 1]} ${startParts.year} AL ${endParts.day} ${
      shortMonths[endParts.month - 1]
    } ${endParts.year}`;
  }

  if (startParts) return formatDateShort(start);
  if (endParts) return formatDateShort(end);
  return [start, end].filter(Boolean).join(" AL ");
};


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

const normalizeTextLine = (line: string) =>
  line
    .replace(/\u00a0/g, " ")
    .replace(/[\u2022\u25CF\u25AA\u25E6\u25FE\u25FC\u25FB\u25A1\u25A0]/g, " ")
    .replace(/[|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const isNoiseLine = (line: string) => {
  if (!line) return true;
  const normalized = line
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (/^[zZxX]+$/.test(normalized)) return true;
  if (!/[A-Za-z0-9]/.test(normalized)) return true;
  return false;
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

const percentageHighlights = new Set(["10%", "30%", "55%", "85%", "100%"]);

const tokenizePolicyPercentages = (text: string) => {
  const parts = text.split(/(\s+)/).filter((part) => part.length > 0);
  const tokens: { text: string; bold: boolean }[] = [];

  parts.forEach((part) => {
    if (/^\s+$/.test(part)) {
      tokens.push({ text: part, bold: false });
      return;
    }

    const match = part.match(/^(\d+%)([.,;:]?)$/);
    if (match && percentageHighlights.has(match[1])) {
      tokens.push({ text: match[1], bold: true });
      if (match[2]) tokens.push({ text: match[2], bold: false });
      return;
    }

    tokens.push({ text: part, bold: false });
  });

  return tokens;
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
  pdfDoc.registerFontkit(fontkit);
  const page = pdfDoc.addPage([612, 792]); // US Letter portrait
  const { width, height } = page.getSize();
  const loadFont = async (fileNames: string[], fallback: StandardFonts) => {
    for (const fileName of fileNames) {
      try {
        const fontBytes = await readFile(path.join(process.cwd(), "public", "fonts", fileName));
        return await pdfDoc.embedFont(fontBytes);
      } catch {
        // Try next candidate.
      }
    }
    return await pdfDoc.embedFont(fallback);
  };

  const headingFont = await loadFont(
    ["Montserrat-Regular.ttf"],
    StandardFonts.Helvetica
  );
  const headingBold = await loadFont(
    ["Montserrat-Bold.ttf"],
    StandardFonts.HelveticaBold
  );
  const headingBoldItalic = await loadFont(
    ["Montserrat-Bold.ttf"],
    StandardFonts.HelveticaBoldOblique
  );
  const bodyFont = await loadFont(
    ["Rubik-Regular.ttf"],
    StandardFonts.Helvetica
  );
  const bodyBold = await loadFont(
    ["Rubik-Bold.ttf"],
    StandardFonts.HelveticaBold
  );

  const margin = 42;
  const headerTop = height - margin;
  const brand = {
    ink: rgb(0, 0, 0),
    muted: rgb(0.2, 0.2, 0.2),
    line: rgb(0.7, 0.7, 0.7),
  };
  const headerRight = width - margin;

  // Logo
  let logoBottomY = headerTop - 84;
  try {
    const logoPath = path.join(process.cwd(), "public", "logoalvvaz.png");
    const logoBytes = await readFile(logoPath);
    const logoImage = await pdfDoc.embedPng(logoBytes);
    const logoDims = logoImage.scale(0.176);
    logoBottomY = headerTop - logoDims.height + 20;
    page.drawImage(logoImage, {
      x: margin - 3,
      y: logoBottomY,
      width: logoDims.width,
      height: logoDims.height,
    });
  } catch {
    // If logo isn't available, continue without it.
  }

  const titleText = (contract.title || "RESERVA DE VIAJE").toUpperCase();
  const titleSize = 15.12;
  const titleWidth = headingFont.widthOfTextAtSize(titleText, titleSize);
  page.drawText(titleText, {
    x: headerRight - titleWidth,
    y: headerTop - 6,
    size: titleSize,
    font: headingFont,
    color: brand.ink,
  });

  const contractNumberRaw = `${contract.contractNumber ?? ""}`.trim();
  const contractWord = "CONTRATO";
  const contractNumberText = contractNumberRaw ? `#${contractNumberRaw}` : "";
  const contractLineSize = 15.12;
  const contractGap = contractNumberText ? 6 : 0;
  const contractWordWidth = headingFont.widthOfTextAtSize(contractWord, contractLineSize);
  const contractNumberWidth = contractNumberText
    ? headingFont.widthOfTextAtSize(contractNumberText, contractLineSize)
    : 0;
  const contractGroupWidth = contractWordWidth + contractGap + contractNumberWidth;
  const contractX = headerRight - contractGroupWidth;
  const contractY = headerTop - 25;

  page.drawRectangle({
    x: contractX - 2,
    y: contractY - 3,
    width: contractWordWidth + 4,
    height: contractLineSize + 4,
    color: rgb(1, 0.96, 0),
  });

  page.drawText(contractWord, {
    x: contractX,
    y: contractY,
    size: contractLineSize,
    font: headingFont,
    color: brand.ink,
  });

  if (contractNumberText) {
    page.drawText(contractNumberText, {
      x: contractX + contractWordWidth + contractGap,
      y: contractY,
      size: contractLineSize,
      font: headingFont,
      color: brand.ink,
    });
  }

  const headerLines = [
    { text: `FECHA DE RESERVA: ${parseDate(contract.reservationDate)}`, size: 9.12, font: headingBold, y: headerTop - 44 },
    { text: "AGENCIA DE VIAJES ALVVAZ", size: 6.96, font: headingFont, y: headerTop - 54 },
    { text: "HERNAN CORTES #508-A COL. INDUSTRIAL AVIACION", size: 7.92, font: headingFont, y: headerTop - 64.5 },
    {
      text: `NOMBRE DEL CLIENTE: ${(contract.clientName ?? "").toUpperCase()}`,
      size: 9.12,
      font: headingFont,
      y: headerTop - 76,
    },
  ];
  headerLines.forEach((line) => {
    const lineWidth = line.font.widthOfTextAtSize(line.text, line.size);
    page.drawText(line.text, {
      x: headerRight - lineWidth,
      y: line.y,
      size: line.size,
      font: line.font,
      color: brand.ink,
    });
  });

  const taglineText = "Mas de 9 A\u00f1os nos Respaldan!...";
  const taglineSize = 9.12;
  const taglineWidth = headingBoldItalic.widthOfTextAtSize(taglineText, taglineSize);
  const taglineX = 44;
  page.drawText(taglineText, {
    x: taglineX,
    y: logoBottomY - 18,
    size: taglineSize,
    font: headingBoldItalic,
    color: brand.muted,
  });

  let cursorY = 622;

  // Vendor/Agency/Destination/Dates row
  const rowX = margin;
  const rowWidth = width - margin * 2;
  const rowHeight = 18;
  const rowLabelY = cursorY;
  const rowBoxTopY = rowLabelY - 6;
  const rowBoxBottomY = rowBoxTopY - rowHeight;
  const colWidths = [125.8, 118.8, 131.3, rowWidth - 375.9];
  const colLabels = ["Vendedor", "AGENCIA", "DESTINO", "FECHAS DE VIAJE"];
  const colValues = [
    (contract.seller ?? contract.organizer ?? "").toUpperCase(),
    (contract.agency ?? "").toUpperCase(),
    contract.destination ?? "",
    formatDateRangeShort(contract.departureDate, contract.returnDate),
  ];
  let labelX = rowX;
  colLabels.forEach((label, index) => {
    page.drawText(label, {
      x: labelX + 5,
      y: rowLabelY,
      size: 10.08,
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
    let valueSize = 10.08;
    while (
      valueSize > 8.4 &&
      headingFont.widthOfTextAtSize(valueText, valueSize) > maxTextWidth
    ) {
      valueSize -= 0.5;
    }
    page.drawText(valueText, {
      x: colX + 4,
      y: rowBoxBottomY + 5,
      size: valueSize,
      font: headingFont,
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

  cursorY = rowBoxBottomY - 11;

  // Description table
  const tableX = margin;
  const tableWidth = rowWidth;
  const tableHeaderHeight = 16.8;
  const tableRowHeight = 24.4;
  const tableCols = [66.5, 368.0, tableWidth - 434.5];
  const tableFontSize = 8.88;
  const tableCostSize = tableFontSize;
  const tableLineHeight = 11.4;
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

  const headerTextY = cursorY - 11.2;
  page.drawText("Cant.", {
    x: tableX + 4,
    y: headerTextY,
    size: tableFontSize,
    font: headingFont,
    color: brand.ink,
  });
  page.drawText("Descripci\u00f3n de lo contratado:", {
    x: tableX + tableCols[0] + 4,
    y: headerTextY,
    size: tableFontSize,
    font: headingFont,
    color: brand.ink,
  });
  page.drawText("COSTOS", {
    x: tableX + tableCols[0] + tableCols[1] + 4,
    y: headerTextY,
    size: tableFontSize,
    font: headingFont,
    color: brand.ink,
  });

  cursorY = tableHeaderBottomY;
  const descriptionRawLines = (contract.description ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim());

  const descriptionRows: Array<{ qty: string; details: string }> = [];
  const extractedNoteLines: string[] = [];

  descriptionRawLines.forEach((rawLine) => {
    const line = normalizeTextLine(rawLine);
    if (isNoiseLine(line)) return;

    const qtyMatch = line.match(/^(\d+)\s*[xX]\s*(.+)$/);
    if (qtyMatch) {
      descriptionRows.push({ qty: qtyMatch[1], details: qtyMatch[2] });
      return;
    }

    const normalizedLine = line
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase();
    const treatAsNote =
      normalizedLine.includes("ADULTO") ||
      normalizedLine.includes("MAYOR") ||
      normalizedLine.includes("MENOR") ||
      normalizedLine.includes("BEBE") ||
      normalizedLine.includes("CHECAR TU FECHA DE LIQUIDACION") ||
      normalizedLine.includes("CANCELACION");

    if (treatAsNote && descriptionRows.length) {
      extractedNoteLines.push(line);
      return;
    }

    if (!descriptionRows.length) {
      descriptionRows.push({ qty: "1", details: line });
      return;
    }

    const last = descriptionRows[descriptionRows.length - 1];
    descriptionRows[descriptionRows.length - 1] = {
      ...last,
      details: `${last.details}\n${line}`,
    };
  });

  if (!descriptionRows.length) {
    descriptionRows.push({ qty: "1", details: "" });
  }

  const total = formatMoney(contract.totalPrice ?? "");
  const minDescriptionRowHeight = tableRowHeight;
  const descriptionLineHeight = tableLineHeight;

  descriptionRows.forEach((item, index) => {
    const qty = item.qty || "1";
    const details = item.details || "-";
    const detailLines = details
      .split(/\r?\n/)
      .flatMap((segment) => {
        const trimmed = segment.trim();
        return trimmed ? wrapText(trimmed, tableCols[1] - 8, headingFont, tableFontSize) : [""];
      });

    const renderedDetailLines = detailLines.length > 0 ? detailLines : [""];
    const rowHeight = Math.max(
      minDescriptionRowHeight,
      renderedDetailLines.length * descriptionLineHeight + 10
    );

    const rowTopY = cursorY;
    const rowBottomY = rowTopY - rowHeight;

    page.drawRectangle({
      x: tableX,
      y: rowBottomY,
      width: tableWidth,
      height: rowHeight,
      borderWidth: 0.5,
      borderColor: brand.line,
    });
    tableColumnEdges.forEach((edgeX) => {
      page.drawLine({
        start: { x: edgeX, y: rowTopY },
        end: { x: edgeX, y: rowBottomY },
        thickness: 0.5,
        color: brand.line,
      });
    });

    page.drawText(qty, {
      x: tableX + 4,
      y: rowTopY - 13.2,
      size: tableFontSize,
      font: headingFont,
      color: brand.ink,
    });

    renderedDetailLines.forEach((detailLine, detailIndex) => {
      page.drawText(detailLine, {
        x: tableX + tableCols[0] + 4,
        y: rowTopY - 13.2 - detailIndex * descriptionLineHeight,
        size: tableFontSize,
        font: headingFont,
        color: brand.ink,
      });
    });

    if (index === 0 && total) {
      page.drawText(`$${total}`, {
        x: tableX + tableCols[0] + tableCols[1] + 24.2,
        y: rowTopY - 12.9,
        size: tableCostSize,
        font: headingFont,
        color: brand.ink,
      });
    }

    cursorY = rowBottomY;
  });

  const noteSourceLines = [
    ...extractedNoteLines,
    ...(contract.notes ?? "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean),
  ];

  const uniqueNoteLines: string[] = [];
  const seenNotes = new Set<string>();
  noteSourceLines.forEach((line) => {
    const normalized = normalizeTextLine(line);
    if (!normalized || seenNotes.has(normalized)) return;
    seenNotes.add(normalized);
    uniqueNoteLines.push(normalized);
  });

  const normalizedNotes = uniqueNoteLines
    .filter((line) => !isNoiseLine(line))
    .flatMap((line) => {
      const normalized = line
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase();

      if (
        normalized.includes("CHECAR TU FECHA DE LIQUIDACION") &&
        normalized.includes("CANCELACIONES")
      ) {
        return [
          "CHECAR TU FECHA DE LIQUIDACION PARA EVITAR",
          "CANCELACIONES",
        ];
      }

      return [line.toUpperCase()];
    });

  const renderedNotes = normalizedNotes.length
    ? normalizedNotes
    : ["CHECAR TU FECHA DE LIQUIDACION PARA EVITAR", "CANCELACIONES"];

  renderedNotes.forEach((line) => {
    const normalized = line
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase();
    const isWarningBold =
      normalized.startsWith("CHECAR TU FECHA DE LIQUIDACION") ||
      normalized === "CANCELACIONES";

    const wrapped = wrapText(line, tableCols[1] - 8, headingFont, tableFontSize);
    const renderedLines = wrapped.length ? wrapped : [line];
    const rowHeight = Math.max(
      minDescriptionRowHeight,
      renderedLines.length * descriptionLineHeight + 8
    );
    const rowTopY = cursorY;
    const rowBottomY = rowTopY - rowHeight;

    page.drawRectangle({
      x: tableX,
      y: rowBottomY,
      width: tableWidth,
      height: rowHeight,
      borderWidth: 0.5,
      borderColor: brand.line,
    });
    tableColumnEdges.forEach((edgeX) => {
      page.drawLine({
        start: { x: edgeX, y: rowTopY },
        end: { x: edgeX, y: rowBottomY },
        thickness: 0.5,
        color: brand.line,
      });
    });

    renderedLines.forEach((noteLine, noteIndex) => {
      page.drawText(noteLine, {
        x: tableX + tableCols[0] + 4,
        y: rowTopY - 13.2 - noteIndex * descriptionLineHeight,
        size: tableFontSize,
        font: isWarningBold ? headingBold : headingFont,
        color: brand.ink,
      });
    });

    cursorY = rowBottomY;
  });

  const tableBottomY = cursorY;
  cursorY = tableBottomY - 30;

  const startNewFooterPage = () => {
  footerPage = pdfDoc.addPage([612, 792]);
  cursorY = height - margin - 24;
};

let footerPage = page;
const ensureFooterSpace = (minY: number) => {
  if (cursorY < minY) {
    startNewFooterPage();
  }
};

ensureFooterSpace(margin + 130);

const connectedCostTopY = footerPage === page ? tableBottomY : cursorY + 30;
const liquidationY = connectedCostTopY - 30;

const liquidationText = `LIQUIDACION DEL VIAJE: ${parseDate(contract.liquidationDate) || "-"}`;
footerPage.drawText(liquidationText, {
  x: tableX + tableCols[0] + 0.2,
  y: liquidationY,
  size: 10.08,
  font: headingFont,
  color: brand.ink,
});

cursorY = liquidationY;

const costLabelX = 396.2;
const costTopY = connectedCostTopY;
const costBottomY = costTopY - 47.6;
const costRowHeight = (costTopY - costBottomY) / 3;
const costLineY = [
  costTopY - 10.8,
  costTopY - 10.8 - costRowHeight,
  costTopY - 10.8 - costRowHeight * 2,
];
const costBoxX = costLabelX - 4;
const costBoxWidth = width - margin - costBoxX;
const costDividerX = tableColumnEdges[1];

if (footerPage === page) {
  // Connected to the main table: do not redraw the top edge to avoid a stray overlap line.
  footerPage.drawLine({
    start: { x: costBoxX, y: costTopY },
    end: { x: costBoxX, y: costBottomY },
    thickness: 0.5,
    color: brand.line,
  });
  footerPage.drawLine({
    start: { x: costBoxX + costBoxWidth, y: costTopY },
    end: { x: costBoxX + costBoxWidth, y: costBottomY },
    thickness: 0.5,
    color: brand.line,
  });
  footerPage.drawLine({
    start: { x: costBoxX, y: costBottomY },
    end: { x: costBoxX + costBoxWidth, y: costBottomY },
    thickness: 0.5,
    color: brand.line,
  });
} else {
  footerPage.drawRectangle({
    x: costBoxX,
    y: costBottomY,
    width: costBoxWidth,
    height: costTopY - costBottomY,
    borderWidth: 0.5,
    borderColor: brand.line,
  });
}

footerPage.drawLine({
  start: { x: costDividerX, y: costTopY },
  end: { x: costDividerX, y: costBottomY },
  thickness: 0.5,
  color: brand.line,
});

footerPage.drawLine({
  start: { x: costBoxX, y: costTopY - costRowHeight },
  end: { x: costBoxX + costBoxWidth, y: costTopY - costRowHeight },
  thickness: 0.5,
  color: brand.line,
});

footerPage.drawLine({
  start: { x: costBoxX, y: costTopY - costRowHeight * 2 },
  end: { x: costBoxX + costBoxWidth, y: costTopY - costRowHeight * 2 },
  thickness: 0.5,
  color: brand.line,
});

const first = formatMoney(contract.firstPayment ?? "");
const balance = formatMoney(contract.balanceDue ?? "");
const costLines = [
  { label: "PRECIO NETO:", value: total ? "$" + total : "MXN", size: 10.08, font: headingFont },
  { label: "PRIMER PAGO:", value: first ? "$" + first : "MXN", size: 10.08, font: headingFont },
  { label: "RESTO POR PAGAR:", value: balance ? "$" + balance : "MXN", size: 7.44, font: headingBold },
];

costLines.forEach((line, index) => {
  const lineY = costLineY[index];
  footerPage.drawText(line.label, {
    x: costLabelX,
    y: lineY,
    size: line.size,
    font: line.font,
    color: brand.ink,
  });

  const valueWidth = headingFont.widthOfTextAtSize(line.value, 9.12);
  const valueRightX = costBoxX + costBoxWidth - 8;
  const minValueX = costDividerX + 6;
  const valueX = Math.max(minValueX, valueRightX - valueWidth);

  footerPage.drawText(line.value, {
    x: valueX,
    y: lineY,
    size: 9.12,
    font: headingFont,
    color: brand.ink,
  });
});

cursorY -= 62.2;
ensureFooterSpace(margin + 80);

const consultaText = "CONSULTA PLAN DE PAGOS PARA LA LIQUIDACION DE TU RESERVA";
const consultaWidth = headingFont.widthOfTextAtSize(consultaText, 10.08);
footerPage.drawText(consultaText, {
  x: (width - consultaWidth) / 2,
  y: cursorY,
  size: 10.08,
  font: headingFont,
  color: brand.ink,
});

cursorY -= 17.3;
const graciasText = "Gracias por tu confianza.";
const graciasWidth = headingBoldItalic.widthOfTextAtSize(graciasText, 10.08);
footerPage.drawText(graciasText, {
  x: (width - graciasWidth) / 2,
  y: cursorY,
  size: 10.08,
  font: headingBoldItalic,
  color: brand.ink,
});

cursorY -= 38.1;
ensureFooterSpace(margin + 60);
const policyTitle = "POLITICAS GENERALES:";
const policyTitleWidth = headingFont.widthOfTextAtSize(policyTitle, 10.08);
footerPage.drawText(policyTitle, {
  x: (width - policyTitleWidth) / 2,
  y: cursorY,
  size: 10.08,
  font: headingFont,
  color: brand.ink,
});

cursorY -= 11.8;
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

const policySize = 6.96;
const policyLineHeight = 11.76 / policySize;
const policyMainX = 44.4;
const policyContinueX = 53;
const policyMaxWidth = width - margin - policyContinueX;

if (cursorY - policySize * policyLineHeight < margin + 20) {
  startNewFooterPage();
}

footerPage.drawText("\u2022", {
  x: 54,
  y: cursorY + 2.4,
  size: policySize,
  font: bodyFont,
  color: brand.ink,
});
cursorY = drawWrapped(
  footerPage,
  policies[0].text,
  72,
  cursorY,
  width - margin - 72,
  bodyBold,
  policySize,
  brand.ink,
  policyLineHeight
);

const policiesBody = policies.slice(1, -1);
policiesBody.forEach((policy) => {
  const estimateFont = policy.level === 1 ? bodyBold : bodyFont;
  const lines = wrapText(policy.text, policyMaxWidth, estimateFont, policySize);
  const estimatedHeight = lines.length * policySize * policyLineHeight + 2;

  if (cursorY - estimatedHeight < margin + 20) {
    startNewFooterPage();
  }

  if (policy.level === 0) {
    if (lines.length > 0) {
      footerPage.drawText(`\u2022 ${lines[0]}`, {
        x: policyMainX,
        y: cursorY,
        size: policySize,
        font: bodyFont,
        color: brand.ink,
      });
      cursorY -= policySize * policyLineHeight;

      lines.slice(1).forEach((line) => {
        footerPage.drawText(line, {
          x: policyContinueX,
          y: cursorY,
          size: policySize,
          font: bodyFont,
          color: brand.ink,
        });
        cursorY -= policySize * policyLineHeight;
      });
    }
    return;
  }

  const tokens = tokenizePolicyPercentages(policy.text);
  cursorY = drawWrappedTokens(
    footerPage,
    tokens,
    policyContinueX,
    cursorY,
    policyMaxWidth,
    bodyFont,
    bodyBold,
    policySize,
    brand.ink,
    brand.ink,
    policyLineHeight
  );
});

if (cursorY < margin + 28) {
  startNewFooterPage();
}

const finalPolicy = `\u2022 ${policies[policies.length - 1].text}`;
const finalPolicyWidth = bodyFont.widthOfTextAtSize(finalPolicy, policySize);
footerPage.drawText(finalPolicy, {
  x: (width - finalPolicyWidth) / 2,
  y: cursorY,
  size: policySize,
  font: bodyFont,
  color: brand.ink,
});

cursorY -= 31.9;
if (cursorY < margin + 22) {
  startNewFooterPage();
}

const addressLine =
  "HERNAN CORTES #508-A COL. INDUSTRIAL AVIACION / CALLE 30 #689 VILLAS DEL SOL";
const addressWidth = bodyBold.widthOfTextAtSize(addressLine, 12);
footerPage.drawText(addressLine, {
  x: (width - addressWidth) / 2,
  y: cursorY,
  size: 12,
  font: bodyBold,
  color: brand.ink,
});

cursorY -= 12;
if (cursorY < margin + 10) {
  startNewFooterPage();
}

const firmaLine = "FIRMA:___________________________AGENCIA ALVVAZ";
const firmaWidth = bodyFont.widthOfTextAtSize(firmaLine, policySize);
footerPage.drawText(firmaLine, {
  x: (width - firmaWidth) / 2,
  y: cursorY,
  size: policySize,
  font: bodyFont,
  color: brand.ink,
});

const pdfBytes = await pdfDoc.save();

  const supabase = getSupabaseAdmin();
  const bucket = process.env.SUPABASE_STORAGE_BUCKET_CONTRACTS || "contracts";
  const pdfBaseName = buildContractPdfBaseName(contract.title, contract.contractNumber, contract.id);
  const storagePath = `${contract.id}/${pdfBaseName}.pdf`;

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

















