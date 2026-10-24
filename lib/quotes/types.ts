import { isIsoDate } from "@/lib/quotes/dates";
import {
  cloneOpenSettings,
  createDefaultOpenSettings,
  DEFAULT_QUOTE_CATEGORIES,
  emptyRates,
  QUOTE_ASIDE_SECTIONS,
  QUOTE_CUSTOM_SECTION_ID,
  QUOTE_MAIN_SECTIONS,
  QUOTE_MAX_CATEGORIES,
  QUOTE_MAX_CUSTOM_SECTIONS,
  QUOTE_ROW_MARKERS,
  QUOTE_TEXT_KEYS,
  QUOTE_TRANSPORT_LABELS,
  type QuoteAsideSection,
  type QuoteCustomSection,
  type QuoteOpenSettings,
  type QuoteRowMarker,
  type QuoteSectionId,
  type QuoteTransport,
} from "@/lib/quotes/open";

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
  // "Habitación Estándar" on the card; each option has its own.
  roomType: string;
  // Shown after the room type on the card ("Habitación Estándar · Plan Todo Incluido").
  // Optional: when cleared, the card shows just the room.
  plan: string;
  // Abierta only: this hotel's own price categories ("DOBLE: $15,000"); a hotel lists only
  // what it offers, and a blank price isn't printed. Abierta options don't use totalPrice.
  rates?: QuoteRate[];
  // Abierta only, optional: short note above the prices ("Costo por persona").
  note?: string;
};

export type QuoteRate = { label: string; price: string };

export type QuoteOptionField = "hotelName" | "totalPrice" | "roomType" | "plan";

export const DEFAULT_QUOTE_PLAN = "Plan Todo Incluido";

export const DEFAULT_LIQUIDATION_DAYS = "21";

// A quote starts with option A; the editor's green "+" next to "Elige tu favorita" adds the next letter.
export const QUOTE_MAX_OPTIONS = 26;

export function quoteOptionLetter(index: number) {
  return String.fromCharCode(65 + index);
}

// Pass an Abierta quote's settings to give the option the default categories, without prices.
export function createEmptyQuoteOption(open?: QuoteOpenSettings): QuoteOption {
  const option: QuoteOption = { hotelName: "", stars: 0, totalPrice: "", roomType: "", plan: DEFAULT_QUOTE_PLAN };
  return open ? { ...option, rates: emptyRates(), note: "" } : option;
}

// Every value is typed by hand in the form. Values that repeat other info are
// pre-filled while editing (lib/quotes/derived.ts) but can still be changed.
// Picked when creating a quote; can't be changed afterwards. All use the same
// template: only the transport icon, the default "Incluye" list and (internacional)
// the starting currency differ. Abierta also lets every fixed text, section and the
// transport icon be changed, and prices each hotel per category (lib/quotes/open.ts).
export type QuoteKind = "aereo" | "terrestre" | "internacional" | "abierta";

export const QUOTE_KIND_LABELS: Record<QuoteKind, string> = {
  aereo: "Aéreo",
  terrestre: "Terrestre",
  internacional: "Internacional",
  abierta: "Abierta",
};

// Label shown next to every amount on the quote. Amounts are typed in this currency;
// nothing is converted.
export type QuoteCurrency = "MXN" | "USD";

export const QUOTE_CURRENCIES: QuoteCurrency[] = ["MXN", "USD"];


export type QuoteData = {
  kind: QuoteKind;
  currency: QuoteCurrency;
  quoteDate: string;
  travelDates: string;
  title: string;
  adults: string;
  // Optional: hidden on the PDF when empty or 0.
  minors: string;
  // One age per menor (digits), typed in the sidebar's RESUMEN line and printed there
  // ("5 Y 8 AÑOS"). Only the first `minors` entries are used; see getMinorAges.
  minorAges: string[];
  depositTotal: string;
  depositPerPerson: string;
  liquidationMonth: string;
  liquidationDay: string;
  liquidationYear: string;
  // How many days before Salida the trip must be paid ("21 días antes de la salida");
  // the liquidation date above is calculated from it (lib/quotes/derived.ts).
  liquidationDays: string;
  nights: string;
  originCode: string;
  destinationCode: string;
  clientName: string;
  // Editor only (never printed on the PDF); optional.
  clientPhone: string;
  vendorName: string;
  departureDate: string;
  departureTime: string;
  // Terrestre only, optional: where the group meets the bus (shown in the SALIDA card).
  meetingPoint: string;
  returnDate: string;
  returnTime: string;
  // Terrestre only, optional: where the bus drops the group off (shown in the REGRESO card).
  returnPoint: string;
  options: QuoteOption[];
  includes: QuoteIncludeItem[];
  // Dates picked in the travel calendar, so it reopens on them. Not shown on the PDF.
  travelRange: { start: string; end: string } | null;
  // Abierta only (lib/quotes/open.ts); the other types never have it.
  open?: QuoteOpenSettings;
};

export type QuoteTextField = Exclude<
  keyof QuoteData,
  "kind" | "currency" | "minorAges" | "options" | "includes" | "travelRange" | "open"
>;

export type QuoteRecord = {
  id: string;
  folio: number;
  clientName: string;
  hotelName: string;
  data: QuoteData;
  // Borradores (autosaved while editing, lib/quotes/db.ts). "draft": never saved for real,
  // so the whole quote is a borrador and has no PDF.
  status: "draft" | null;
  // A saved quote's edits kept as a borrador; `data` and the PDF stay the last saved version
  // until it's saved again or the borrador is discarded.
  draftData: QuoteData | null;
  storageBucket: string | null;
  storagePath: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
};

// Full record so a list card can open the editor inline; createdByName is the creator's username or email.
export type QuoteListItem = QuoteRecord & { createdByName: string | null };

// The list shows quotes 20 at a time (arrows under the list); search covers every quote
// and is paged the same way (listQuotes in lib/quotes/db.ts).
export const QUOTE_PAGE_SIZE = 20;

export type QuoteListPage = { quotes: QuoteListItem[]; total: number; page: number };

export const QUOTE_MAX_STARS = 5;
const MAX_TEXT_LENGTH = 300;
const MAX_INCLUDES = 30;
const MAX_MINORS = 20;

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
  "liquidationDays",
  "nights",
  "originCode",
  "destinationCode",
  "clientName",
  "clientPhone",
  "vendorName",
  "departureDate",
  "departureTime",
  "meetingPoint",
  "returnDate",
  "returnTime",
  "returnPoint",
];

// Can be left empty: not required and not counted as missing in the editor.
export const QUOTE_OPTIONAL_FIELDS: QuoteTextField[] = [
  "clientPhone",
  "minors",
  "meetingPoint",
  "returnPoint",
];

// Fields a type doesn't show at all (not on the document, not counted in "Faltan").
// Internacional has no flight times: the SALIDA / REGRESO cards show only the date.
export const QUOTE_HIDDEN_FIELDS: Record<QuoteKind, QuoteTextField[]> = {
  aereo: [],
  terrestre: [],
  internacional: ["departureTime", "returnTime"],
  abierta: [],
};

// Optional on top of QUOTE_OPTIONAL_FIELDS for one type. Abierta prices per person,
// so the people are optional, and so are the SALIDA / REGRESO times.
const QUOTE_KIND_OPTIONAL_FIELDS: Record<QuoteKind, QuoteTextField[]> = {
  aereo: [],
  terrestre: [],
  internacional: [],
  abierta: ["adults", "departureTime", "returnTime"],
};

export function isQuoteFieldOptional(kind: QuoteKind, field: QuoteTextField) {
  return QUOTE_OPTIONAL_FIELDS.includes(field) || QUOTE_KIND_OPTIONAL_FIELDS[kind].includes(field);
}

const AEREO_INCLUDES: QuoteIncludeItem[] = [
  { title: "Vuelos directos", auto: "route" },
  { title: "Traslados", detail: "Aeropuerto / Hotel / Aeropuerto en servicio compartido" },
  { title: "Plan Todo Incluido" },
  { title: "Alimentos tipo buffet,", detail: "con horarios indicados a su llegada" },
  { title: "Barra libre ilimitada,", detail: "con horarios establecidos" },
  { title: "Snacks", detail: "diurnos" },
  { title: "Impuestos y propinas", note: "no incluye saneamiento" },
  { title: "En cortesía", detail: "1 maleta de 15 kg documentada + equipaje personal por adulto" },
  { detail: "de hospedaje", auto: "stay" },
];

// Starting "Incluye" list for each type; every item can be edited, moved or removed.
// `auto` items fill themselves: "route" from Origen / Destino, "stay" from Noches + Habitación.
export const DEFAULT_QUOTE_INCLUDES: Record<QuoteKind, QuoteIncludeItem[]> = {
  aereo: AEREO_INCLUDES,
  // Same as aéreo until the agency sends its own international list.
  internacional: AEREO_INCLUDES,
  // Only the first Abierta starts from it; later ones copy the latest Abierta.
  abierta: AEREO_INCLUDES,
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
  const open = kind === "abierta" ? createDefaultOpenSettings() : undefined;
  return {
    ...data,
    kind,
    // Internacional starts in dollars; the picker on the quote can switch it.
    currency: kind === "internacional" ? "USD" : "MXN",
    liquidationDays: DEFAULT_LIQUIDATION_DAYS,
    minorAges: [],
    options: [createEmptyQuoteOption(open)],
    includes: DEFAULT_QUOTE_INCLUDES[kind].map((item) => ({ ...item })),
    travelRange: null,
    ...(open ? { open } : null),
  };
}

// Client is always required, and so is a hotel unless an Abierta quote hides its options.
// Returns the error to show, or null when the quote can be saved.
export function getQuoteSaveError(data: QuoteData) {
  const needsHotel = !data.open?.layout.hidden.includes("options");
  if (data.clientName.trim() && (!needsHotel || formatQuoteHotels(data))) return null;
  return needsHotel ? "El cliente y al menos un hotel son obligatorios." : "El cliente es obligatorio.";
}

// A new quote pre-filled from an earlier one (the latest of the same type, like new
// contracts start from the latest contract). The trip, flights, options, prices and
// Incluye carry over; the client and the people start empty, and so does Reserva con,
// which is calculated from the people. The editor sets today's date and the Vendedor.
export function createQuoteDataFrom(source: QuoteData): QuoteData {
  return {
    ...source,
    clientName: "",
    clientPhone: "",
    adults: "",
    minors: "",
    minorAges: [],
    depositTotal: "",
    options: source.options.map((option) =>
      option.rates ? { ...option, rates: option.rates.map((rate) => ({ ...rate })) } : { ...option }
    ),
    includes: source.includes.map((item) => ({ ...item })),
    travelRange: source.travelRange ? { ...source.travelRange } : null,
    ...(source.open ? { open: cloneOpenSettings(source.open) } : null),
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

// One age per menor for the current Menores count ("" where not typed yet).
export function getMinorAges(data: Pick<QuoteData, "minors" | "minorAges">) {
  const count = Math.min(Math.max(Number.parseInt(data.minors, 10) || 0, 0), MAX_MINORS);
  return Array.from({ length: count }, (_, index) => data.minorAges[index] ?? "");
}

// "5 AÑOS", "5 Y 8 AÑOS", "3, 5 Y 8 AÑOS"; ages not typed yet are left out.
export function formatMinorAges(ages: string[]) {
  const filled = ages.map((age) => age.trim()).filter(Boolean);
  if (!filled.length) return "";
  const list =
    filled.length === 1 ? filled[0] : `${filled.slice(0, -1).join(", ")} Y ${filled[filled.length - 1]}`;
  return `${list} ${filled.length === 1 && filled[0] === "1" ? "AÑO" : "AÑOS"}`;
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

  if (Array.isArray(source.minorAges)) {
    data.minorAges = source.minorAges
      .slice(0, MAX_MINORS)
      .map((age) => (typeof age === "string" ? age.replace(/\D/g, "").slice(0, 2) : ""));
  }

  // Quotes saved before types existed are all aéreo.
  const kind: QuoteKind =
    source.kind === "terrestre" || source.kind === "internacional" || source.kind === "abierta"
      ? source.kind
      : "aereo";
  const open = kind === "abierta" ? parseOpenSettings(source.open) : undefined;
  // Abierta quotes saved before each hotel had its own categories had one list for the whole
  // quote (`open.categories`) and each option's prices in that order.
  const sharedLabels = (source.open as { categories?: unknown } | undefined)?.categories;
  const legacyLabels = Array.isArray(sharedLabels) && sharedLabels.length ? sharedLabels.map(toText) : null;

  // Quotes saved before options existed had one hotel at the top level; it becomes option A.
  // Blank options (an added letter left empty, or B/C from when every quote had three) are
  // dropped so the letters stay consecutive; there is always at least option A.
  const rawOptions = Array.isArray(source.options) ? source.options : [source];
  const options = rawOptions
    .slice(0, QUOTE_MAX_OPTIONS)
    .map((raw) => {
      const option = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
      return {
        hotelName: toText(option.hotelName),
        stars: toStars(option.stars),
        totalPrice: toText(option.totalPrice),
        // Quotes saved before each option had its own room had one for the whole quote.
        roomType: toText(typeof option.roomType === "string" ? option.roomType : source.roomType),
        // Options saved before the plan was editable all said "Plan Todo Incluido".
        plan: typeof option.plan === "string" ? toText(option.plan) : DEFAULT_QUOTE_PLAN,
        ...(open ? { rates: parseRates(option, legacyLabels), note: toText(option.note) } : null),
      };
    })
    // Room and plan don't count: old blank B/C got the quote's room copied in above. Nor do
    // Abierta's note and category names, which a new option copies from the one above.
    .filter(
      (option) =>
        option.hotelName.trim() ||
        option.totalPrice.trim() ||
        option.stars ||
        option.rates?.some((rate) => rate.price.trim())
    );
  data.options = options.length ? options : [createEmptyQuoteOption(open)];

  // Quotes saved before the currency picker existed are all in pesos.
  data.currency = source.currency === "USD" ? "USD" : "MXN";

  // Quotes saved before the days were editable all used 21.
  if (typeof source.liquidationDays !== "string") data.liquidationDays = DEFAULT_LIQUIDATION_DAYS;

  data.kind = kind;
  if (open) data.open = open;

  const range = source.travelRange as { start?: unknown; end?: unknown } | null | undefined;
  if (range && isIsoDate(range.start) && isIsoDate(range.end) && range.start <= range.end) {
    data.travelRange = { start: range.start, end: range.end };
  }

  if (Array.isArray(source.includes)) {
    data.includes = parseRows(source.includes);
  }

  return data;
}

// "Incluye" items, payment methods and custom section rows: title, detail and note,
// empty parts left out.
function parseRows(input: unknown[]) {
  return input.slice(0, MAX_INCLUDES).map((raw) => {
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

// An Abierta option's own categories. Older saves had prices only, matched by position to
// the quote's shared list; with neither, the option starts with the default categories.
function parseRates(option: Record<string, unknown>, legacyLabels: string[] | null): QuoteRate[] {
  if (Array.isArray(option.rates)) {
    return option.rates.slice(0, QUOTE_MAX_CATEGORIES).map((raw) => {
      const rate = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
      return { label: toText(rate.label), price: toText(rate.price) };
    });
  }
  if (Array.isArray(option.prices)) {
    const prices = option.prices;
    return (legacyLabels ?? DEFAULT_QUOTE_CATEGORIES)
      .slice(0, QUOTE_MAX_CATEGORIES)
      .map((label, index) => ({ label, price: toText(prices[index]) }));
  }
  return emptyRates();
}

// Abierta's `data.open`. Anything missing or invalid falls back to the defaults; the
// layout always lists every built-in section and every custom one exactly once.
function parseOpenSettings(input: unknown): QuoteOpenSettings {
  const source = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const open = createDefaultOpenSettings();

  const texts = (source.texts && typeof source.texts === "object" ? source.texts : {}) as Record<string, unknown>;
  for (const key of QUOTE_TEXT_KEYS) {
    if (typeof texts[key] === "string") open.texts[key] = toText(texts[key]);
  }

  if (Array.isArray(source.payment)) open.payment = parseRows(source.payment);

  if (Array.isArray(source.sections)) {
    const ids = new Set<string>();
    open.sections = source.sections
      .slice(0, QUOTE_MAX_CUSTOM_SECTIONS)
      .map((raw) => (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>)
      .filter((section) => {
        const id = section.id;
        if (typeof id !== "string" || !QUOTE_CUSTOM_SECTION_ID.test(id) || ids.has(id)) return false;
        ids.add(id);
        return true;
      })
      .map(
        (section): QuoteCustomSection => ({
          id: section.id as string,
          heading: toText(section.heading),
          label: toText(section.label),
          marker: QUOTE_ROW_MARKERS.includes(section.marker as QuoteRowMarker)
            ? (section.marker as QuoteRowMarker)
            : "check",
          items: Array.isArray(section.items) ? parseRows(section.items) : [],
        })
      );
  }

  const layout = (source.layout && typeof source.layout === "object" ? source.layout : {}) as Record<
    string,
    unknown
  >;
  const customIds = open.sections.map((section) => section.id);
  const orderOf = <T extends string>(raw: unknown, known: readonly T[]) => {
    const order = (Array.isArray(raw) ? raw : []).filter(
      (id, index, list): id is T => known.includes(id as T) && list.indexOf(id) === index
    );
    return [...order, ...known.filter((id) => !order.includes(id))];
  };
  open.layout.main = orderOf(layout.main, [...QUOTE_MAIN_SECTIONS, ...customIds]);
  open.layout.aside = orderOf<QuoteAsideSection>(layout.aside, QUOTE_ASIDE_SECTIONS);
  const builtIn: readonly string[] = [...QUOTE_MAIN_SECTIONS, ...QUOTE_ASIDE_SECTIONS];
  open.layout.hidden = (Array.isArray(layout.hidden) ? layout.hidden : []).filter(
    (id, index, list): id is QuoteSectionId => builtIn.includes(id as string) && list.indexOf(id) === index
  );

  if (Object.keys(QUOTE_TRANSPORT_LABELS).includes(source.transport as string)) {
    open.transport = source.transport as QuoteTransport;
  }

  return open;
}
