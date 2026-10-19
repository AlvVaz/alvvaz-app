import { isIsoDate } from "@/lib/quotes/dates";

export type QuoteIncludeItem = {
  title?: string;
  detail?: string;
  note?: string;
  // Marks a default item whose text is built from other fields (lib/quotes/derived.ts):
  // "route" = flight route from Origen/Destino, "stay" = Noches + Habitación.
  auto?: "route" | "stay";
};

export type QuoteIncludePart = "title" | "detail" | "note";

// The only values that change between a quote's hotel options.
export type QuoteOption = {
  hotelName: string;
  stars: number;
  totalPrice: string;
};

export type QuoteOptionField = "hotelName" | "totalPrice";

// Every quote has exactly these options (the agency always quotes three hotels).
export const QUOTE_OPTION_LETTERS = ["A", "B", "C"] as const;

// Every value is typed by hand in the form. Values that repeat other info are
// pre-filled while editing (lib/quotes/derived.ts) but can still be changed.
// Picked when creating a quote; can't be changed afterwards. Both use the same
// template: only the transport icon and the default "Incluye" list differ.
export type QuoteKind = "aereo" | "terrestre";

export const QUOTE_KIND_LABELS: Record<QuoteKind, string> = { aereo: "Aéreo", terrestre: "Terrestre" };


export type QuoteData = {
  kind: QuoteKind;
  quoteDate: string;
  travelDates: string;
  title: string;
  adults: string;
  // Optional: hidden on the PDF when empty or 0.
  minors: string;
  depositTotal: string;
  depositPerPerson: string;
  liquidationMonth: string;
  liquidationDay: string;
  liquidationYear: string;
  nights: string;
  originCode: string;
  destinationCode: string;
  clientName: string;
  // Editor only (never printed on the PDF); optional.
  clientPhone: string;
  vendorName: string;
  roomType: string;
  departureDate: string;
  departureTime: string;
  // Terrestre only, optional: where the group meets the bus (shown in the SALIDA card).
  meetingPoint: string;
  returnDate: string;
  returnTime: string;
  options: QuoteOption[];
  includes: QuoteIncludeItem[];
  // Dates picked in the travel calendar, so it reopens on them. Not shown on the PDF.
  travelRange: { start: string; end: string } | null;
};

export type QuoteTextField = Exclude<keyof QuoteData, "kind" | "options" | "includes" | "travelRange">;

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
  "title",
  "adults",
  "minors",
  "depositTotal",
  "depositPerPerson",
  "liquidationMonth",
  "liquidationDay",
  "liquidationYear",
  "nights",
  "originCode",
  "destinationCode",
  "clientName",
  "clientPhone",
  "vendorName",
  "roomType",
  "departureDate",
  "departureTime",
  "meetingPoint",
  "returnDate",
  "returnTime",
];

// Can be left empty: not required and not counted as missing in the editor.
export const QUOTE_OPTIONAL_FIELDS: QuoteTextField[] = ["clientPhone", "minors", "meetingPoint"];

// Starting "Incluye" list for each type; every item can be edited, moved or removed.
// `auto` items fill themselves: "route" from Origen / Destino, "stay" from Noches + Habitación.
export const DEFAULT_QUOTE_INCLUDES: Record<QuoteKind, QuoteIncludeItem[]> = {
  aereo: [
    { title: "Vuelos directos", auto: "route" },
    { title: "Traslados", detail: "Aeropuerto / Hotel / Aeropuerto en servicio compartido" },
    { title: "Plan Todo Incluido" },
    { title: "Alimentos tipo buffet,", detail: "con horarios indicados a su llegada" },
    { title: "Barra libre ilimitada,", detail: "con horarios establecidos" },
    { title: "Snacks", detail: "diurnos" },
    { title: "Impuestos y propinas", note: "no incluye saneamiento" },
    { title: "En cortesía", detail: "1 maleta de 15 kg documentada + equipaje personal por adulto" },
    { detail: "de hospedaje", auto: "stay" },
  ],
  terrestre: [
    { title: "Transporte primera clase", detail: "con seguro de viajero dentro de la unidad" },
    { title: "Plan Todo Incluido", detail: "en hotel" },
    { title: "Alimentos tipo buffet" },
    { title: "Barra libre" },
    { title: "A pie de playa" },
    { title: "Impuestos y propinas", detail: "ya incluidos" },
    { title: "Deportes acuáticos", detail: "no motorizados" },
    { detail: "de hospedaje", auto: "stay" },
  ],
};

export function createEmptyQuoteData(kind: QuoteKind = "aereo"): QuoteData {
  const data = Object.fromEntries(QUOTE_TEXT_FIELDS.map((field) => [field, ""])) as Record<
    QuoteTextField,
    string
  >;
  return {
    ...data,
    kind,
    options: QUOTE_OPTION_LETTERS.map(() => ({ hotelName: "", stars: 0, totalPrice: "" })),
    includes: DEFAULT_QUOTE_INCLUDES[kind].map((item) => ({ ...item })),
    travelRange: null,
  };
}

// Name the PDF is saved/downloaded as: "1002-Juan Pérez-Viaje a Cancún.pdf".
// Empty parts are skipped; characters not allowed in file names are dropped.
export function buildQuotePdfFileName(folio: number | string, data: Pick<QuoteData, "clientName" | "title">) {
  const clean = (value: string) =>
    value
      .replace(/[\\/:*?"<>|\u0000-\u001f]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80);
  return `${[String(folio), clean(data.clientName), clean(data.title)].filter(Boolean).join("-")}.pdf`;
}

// Stored in the Quote.hotelName column so the list and search cover every option.
export function formatQuoteHotels(data: QuoteData) {
  return data.options
    .map((option) => option.hotelName.trim())
    .filter(Boolean)
    .join(" · ");
}

const toStars = (value: unknown) => {
  const stars = Number(value);
  return Number.isInteger(stars) ? Math.min(Math.max(stars, 0), QUOTE_MAX_STARS) : 0;
};

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

  // Quotes saved before options existed had one hotel at the top level; it becomes option A.
  const options = Array.isArray(source.options) ? source.options : [source];
  data.options = data.options.map((empty, index) => {
    const raw = options[index];
    if (!raw || typeof raw !== "object") return empty;
    const option = raw as Record<string, unknown>;
    return {
      hotelName: toText(option.hotelName),
      stars: toStars(option.stars),
      totalPrice: toText(option.totalPrice),
    };
  });

  // Quotes saved before types existed are all aéreo.
  data.kind = source.kind === "terrestre" ? "terrestre" : "aereo";

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
      if (item.auto === "route" || item.auto === "stay") parsed.auto = item.auto;
      return parsed;
    });
  }

  return data;
}
