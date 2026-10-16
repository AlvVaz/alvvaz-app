import { isIsoDate } from "@/lib/quotes/dates";

export type QuoteIncludeItem = {
  title?: string;
  detail?: string;
  note?: string;
};

// Every value is typed by hand in the form; nothing is calculated.
export type QuoteData = {
  quoteDate: string;
  travelDates: string;
  totalPrice: string;
  adults: string;
  depositTotal: string;
  depositPerPerson: string;
  liquidationMonth: string;
  liquidationDay: string;
  liquidationYear: string;
  hotelName: string;
  location: string;
  stars: number;
  nights: string;
  originCode: string;
  originCity: string;
  destinationCode: string;
  clientName: string;
  vendorName: string;
  roomType: string;
  seats: string;
  departureDate: string;
  departureTime: string;
  returnDate: string;
  returnTime: string;
  includes: QuoteIncludeItem[];
  // Dates picked in the travel calendar, so it reopens on them. Not shown on the PDF.
  travelRange: { start: string; end: string } | null;
};

export type QuoteTextField = Exclude<keyof QuoteData, "stars" | "includes" | "travelRange">;

export type QuoteRecord = {
  id: string;
  folio: number;
  clientName: string;
  hotelName: string;
  data: QuoteData;
  storageBucket: string | null;
  storagePath: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
};

// Full record so a list card can open the editor inline; createdByName is the creator's username or email.
export type QuoteListItem = QuoteRecord & { createdByName: string | null };

export const QUOTE_MAX_STARS = 5;
const MAX_TEXT_LENGTH = 300;
const MAX_INCLUDES = 30;

export const QUOTE_TEXT_FIELDS: QuoteTextField[] = [
  "quoteDate",
  "travelDates",
  "totalPrice",
  "adults",
  "depositTotal",
  "depositPerPerson",
  "liquidationMonth",
  "liquidationDay",
  "liquidationYear",
  "hotelName",
  "location",
  "nights",
  "originCode",
  "originCity",
  "destinationCode",
  "clientName",
  "vendorName",
  "roomType",
  "seats",
  "departureDate",
  "departureTime",
  "returnDate",
  "returnTime",
];

export const DEFAULT_QUOTE_INCLUDES: QuoteIncludeItem[] = [
  { title: "Vuelos directos", detail: "SLP / Cancún / SLP" },
  { title: "Traslados", detail: "Apto / Hotel / Apto en servicio compartido" },
  { title: "Plan Todo Incluido" },
  { title: "Alimentos tipo buffet,", detail: "con horarios indicados a su llegada" },
  { title: "Barra libre ilimitada,", detail: "con horarios establecidos" },
  { title: "Snacks", detail: "diurnos" },
  { title: "Impuestos y propinas", note: "no incluye saneamiento" },
  { detail: "En cortesía 1 maleta de 15 kg documentada + equipaje personal por adulto" },
  { title: "3 noches", detail: "de hospedaje en habitación estándar" },
];

export function createEmptyQuoteData(): QuoteData {
  const data = Object.fromEntries(QUOTE_TEXT_FIELDS.map((field) => [field, ""])) as Record<
    QuoteTextField,
    string
  >;
  return {
    ...data,
    stars: 0,
    includes: DEFAULT_QUOTE_INCLUDES.map((item) => ({ ...item })),
    travelRange: null,
  };
}

// "15 de octubre 2026", in Mexico time so the server render and the browser agree.
export function formatQuoteDate(date: Date) {
  const parts = new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Mexico_City",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("day")} de ${part("month")} ${part("year")}`;
}

const toText = (value: unknown) =>
  typeof value === "string" ? value.slice(0, MAX_TEXT_LENGTH) : "";

// Normalizes untrusted input (request bodies, stored JSON) into QuoteData.
export function parseQuoteData(input: unknown): QuoteData {
  const source = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const data = createEmptyQuoteData();

  for (const field of QUOTE_TEXT_FIELDS) {
    data[field] = toText(source[field]);
  }

  const stars = Number(source.stars);
  data.stars = Number.isInteger(stars) ? Math.min(Math.max(stars, 0), QUOTE_MAX_STARS) : 0;

  const range = source.travelRange as { start?: unknown; end?: unknown } | null | undefined;
  if (range && isIsoDate(range.start) && isIsoDate(range.end) && range.start <= range.end) {
    data.travelRange = { start: range.start, end: range.end };
  }

  if (Array.isArray(source.includes)) {
    data.includes = source.includes.slice(0, MAX_INCLUDES).map((raw) => {
      const item = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
      const parsed: QuoteIncludeItem = {};
      const title = toText(item.title);
      const detail = toText(item.detail);
      const note = toText(item.note);
      if (title) parsed.title = title;
      if (detail) parsed.detail = detail;
      if (note) parsed.note = note;
      return parsed;
    });
  }

  return data;
}
