import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

import { prisma } from "@/lib/prisma";
import { createContract, syncClientsFromTravelers, syncTripFromContract } from "@/lib/db";

export const runtime = "nodejs";

const headerMap: Record<string, string> = {
  "nombre del cliente": "clientName",
  "nombre cliente": "clientName",
  cliente: "clientName",
  "fecha de salida": "departureDate",
  salida: "departureDate",
  "fecha de regreso": "returnDate",
  regreso: "returnDate",
  destino: "destination",
  hotel: "hotel",
  "tel de cliente": "phone",
  telefono: "phone",
  "tel cliente": "phone",
  pasajeros: "passengerCount",
  vendedor: "seller",
  proveedor: "supplier",
  contrato: "contractNumber",
};

const monthMap: Record<string, number> = {
  enero: 0,
  febrero: 1,
  marzo: 2,
  abril: 3,
  mayo: 4,
  junio: 5,
  julio: 6,
  agosto: 7,
  septiembre: 8,
  setiembre: 8,
  octubre: 9,
  noviembre: 10,
  diciembre: 11,
};

const normalizeHeader = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();

const toSafeString = (value: unknown) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  return String(value).trim();
};

const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseSpanishDate = (raw: string, year: number) => {
  const value = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!value) return null;
  const match = value.match(/(\d{1,2})\s*(?:de\s*)?([a-z]+)/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = monthMap[match[2]];
  if (!Number.isFinite(day) || month === undefined) return null;
  const date = new Date(year, month, day);
  return formatDate(date);
};

const parseDateValue = (value: unknown, year: number) => {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatDate(value);
  }
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed && parsed.y && parsed.m && parsed.d) {
      return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
    }
  }
  const text = toSafeString(value);
  return parseSpanishDate(text, year);
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const year = Number(formData.get("year") ?? "2025") || 2025;

    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "No se encontró el archivo." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: "",
    });

    const summary = {
      total: rows.length,
      created: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      try {
        const normalized: Record<string, unknown> = {};
        Object.entries(row).forEach(([key, value]) => {
          const mappedKey = headerMap[normalizeHeader(key)];
          if (mappedKey) normalized[mappedKey] = value;
        });

        const clientNameRaw = toSafeString(normalized.clientName);
        const clientName = clientNameRaw || "Sin nombre";
        const destination = toSafeString(normalized.destination) || "Sin destino";
        const hotel = toSafeString(normalized.hotel) || "Sin hotel";
        const seller = toSafeString(normalized.seller);
        const supplier = toSafeString(normalized.supplier);
        const contractNumber = toSafeString(normalized.contractNumber) || null;
        const phoneRaw = toSafeString(normalized.phone);
        const phone = phoneRaw.replace(/\.0$/, "");
        const passengerRaw = toSafeString(normalized.passengerCount);
        const passengerCountMatch = passengerRaw.match(/\d+/);
        const passengerCount = passengerCountMatch
          ? Number(passengerCountMatch[0])
          : Number(passengerRaw) || 0;

        const departureDate = parseDateValue(normalized.departureDate, year);
        const returnDate = parseDateValue(normalized.returnDate, year);

        const rowIssues: string[] = [];
        if (!clientNameRaw) rowIssues.push("cliente sin nombre");
        if (!phone) rowIssues.push("sin teléfono");
        if (!toSafeString(normalized.destination)) rowIssues.push("sin destino");
        if (!toSafeString(normalized.hotel)) rowIssues.push("sin hotel");
        if (rowIssues.length) {
          summary.errors.push(`Fila ${index + 2}: ${rowIssues.join(", ")}`);
        }

        if (contractNumber) {
          const existing = await prisma.contract.findFirst({
            where: { contractNumber },
          });
          if (existing) {
            summary.skipped += 1;
            continue;
          }
        }

        const travelers =
          clientNameRaw
            ? [{ name: clientNameRaw, phone, contract: contractNumber ?? "" }]
            : [];

        const contract = await createContract({
          title: clientName,
          contractNumber,
          reservationDate: null,
          seller: seller || null,
          agency: null,
          clientName,
          destination,
          hotel: hotel || null,
          supplier: supplier || null,
          organizer: seller || null,
          passengerCount: passengerCount || travelers.length || null,
          departureDate,
          returnDate,
          travelers,
          description: null,
          totalPrice: null,
          firstPayment: null,
          balanceDue: null,
          liquidationDate: null,
          status: "paid",
          isSigned: true,
          isPaid: true,
          fileUrl: null,
          metadata: { source: "excel", year },
        });

        await syncTripFromContract(contract);

        await syncClientsFromTravelers(travelers, {
          source: "contract",
          destination,
          hotel,
          supplier,
          organizer: seller || null,
          agency: null,
        });

        summary.created += 1;
      } catch (error) {
        summary.errors.push(
          `Fila ${index + 2}: ${(error as Error).message || "Error al importar"}`
        );
      }
    }

    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: (error as Error).message || "No se pudo importar." },
      { status: 500 }
    );
  }
}
