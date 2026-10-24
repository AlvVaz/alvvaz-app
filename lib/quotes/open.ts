import type { QuoteIncludeItem, QuoteRate, QuoteTextField } from "@/lib/quotes/types";

// Abierta quotes (kind "abierta") keep everything the other types fix in the template
// under `data.open`: the fixed texts, the order and visibility of the sections, extra
// sections, the payment methods and the transport icon. Each hotel option has its own
// price categories (`option.rates`). The other types never have `data.open` and always
// render the defaults below.

// Fixed texts of the template. The other types always show these; Abierta can change
// each one (`data.open.texts` keeps only the changed ones). "**text**" is bold.
export const QUOTE_TEXT_DEFAULTS = {
  folioLabel: "COTIZACIÓN",
  quoteDateLabel: "FECHA DE COTIZACIÓN",
  travelDatesLabel: "FECHAS DE VIAJE",
  summaryLabel: "RESUMEN",
  summaryOption: "Opción",
  reserveLabel: "RESERVA CON",
  reservePerPerson: "mínimo por persona",
  reserveEach: "por persona",
  liquidationTitle: "Liquidación del viaje",
  liquidationNote: "antes de la salida. Abona semanal, quincenal o mensual.",
  paymentLabel: "MÉTODOS DE PAGO",
  tagline: "Más de 10 años nos respaldan",
  address1: "Agencia de Viajes Alvvaz",
  address2: "Hernán Cortés #508-A, Col. Industrial Aviación",
  address3: "Calle 30 #689, Villas del Sol",
  subtitle: "noches con salida desde",
  clientLabel: "PREPARADA PARA",
  vendorLabel: "VENDEDOR",
  departureLabel: "SALIDA",
  returnLabel: "REGRESO",
  meetingPointLabel: "Punto de salida:",
  returnPointLabel: "Punto de regreso:",
  optionsHeading: "Elige tu favorita",
  optionsLabel: "COSTO POR PERSONA",
  roomLabel: "Habitación",
  includesHeading: "Incluye",
  includesLabel: "CONSULTA CON TU EJECUTIVO PARA MÁS DETALLES",
  depositStart: "Con",
  depositAmount: "**como mínimo por persona**",
  depositMiddle:
    "podemos reservar, y estar dando el resto poco a poco, **semanal, quincenal o mensual**. Teniendo que estar **liquidado**",
  depositEnd: "**antes del viaje**.",
  closingNote:
    "**Recuerden: esto solo es una cotización.** Precios garantizados hasta obtener un pago en firme. Paquetes sujetos a disponibilidad.",
  closingThanks: "Gracias por tu confianza.",
  closingBrand: "AGENCIA ALVVAZ",
  closingPolicies: "Consulta las políticas generales con tu ejecutivo AlvVaz.",
};

export type QuoteTextKey = keyof typeof QUOTE_TEXT_DEFAULTS;

export const QUOTE_TEXT_KEYS = Object.keys(QUOTE_TEXT_DEFAULTS) as QuoteTextKey[];

// Popover titles for the texts above.
export const QUOTE_TEXT_LABELS: Record<QuoteTextKey, string> = {
  folioLabel: "Título del folio",
  quoteDateLabel: "Título de la fecha",
  travelDatesLabel: "Título de las fechas de viaje",
  summaryLabel: "Título del resumen",
  summaryOption: "Resumen: opción",
  reserveLabel: "Título de reserva",
  reservePerPerson: "Reserva: mínimo por persona",
  reserveEach: "Reserva: por persona",
  liquidationTitle: "Título de liquidación",
  liquidationNote: "Texto de liquidación",
  paymentLabel: "Título de métodos de pago",
  tagline: "Frase de la agencia",
  address1: "Dirección: línea 1",
  address2: "Dirección: línea 2",
  address3: "Dirección: línea 3",
  subtitle: "Subtítulo",
  clientLabel: "Título del cliente",
  vendorLabel: "Título del vendedor",
  departureLabel: "Título de salida",
  returnLabel: "Título de regreso",
  meetingPointLabel: "Título del punto de salida",
  returnPointLabel: "Título del punto de regreso",
  optionsHeading: "Título de las opciones",
  optionsLabel: "Etiqueta de las opciones",
  roomLabel: "Antes del tipo de habitación",
  includesHeading: "Título de incluye",
  includesLabel: "Etiqueta de incluye",
  depositStart: "Nota: inicio",
  depositAmount: "Nota: después del monto",
  depositMiddle: "Nota: texto",
  depositEnd: "Nota: final",
  closingNote: "Aviso final",
  closingThanks: "Agradecimiento",
  closingBrand: "Firma",
  closingPolicies: "Línea de políticas",
};

// Sections that can be moved or hidden. The top of each column (logo, folio, dates,
// title, client and vendor) always stays where it is.
export const QUOTE_MAIN_SECTIONS = ["transport", "options", "includes", "deposit", "closing"] as const;
export const QUOTE_ASIDE_SECTIONS = ["summary", "reserve", "liquidation", "payment", "brand"] as const;

export type QuoteMainSection = (typeof QUOTE_MAIN_SECTIONS)[number];
export type QuoteAsideSection = (typeof QUOTE_ASIDE_SECTIONS)[number];
export type QuoteSectionId = QuoteMainSection | QuoteAsideSection;

export const QUOTE_SECTION_LABELS: Record<QuoteSectionId, string> = {
  transport: "Salida / Regreso",
  options: "Opciones",
  includes: "Incluye",
  deposit: "Nota de reserva",
  closing: "Cierre",
  summary: "Resumen",
  reserve: "Reserva con",
  liquidation: "Liquidación",
  payment: "Métodos de pago",
  brand: "Agencia",
};

// Sections added with "Agregar sección" (main column only), built like "Incluye".
export type QuoteCustomSection = {
  id: string;
  heading: string;
  // Small uppercase text on the right of the heading; optional.
  label: string;
  marker: QuoteRowMarker;
  items: QuoteIncludeItem[];
};

export type QuoteRowMarker = "check" | "dot" | "none";

export const QUOTE_ROW_MARKERS: QuoteRowMarker[] = ["check", "dot", "none"];

export const QUOTE_CUSTOM_SECTION_ID = /^custom-[a-z0-9]{1,16}$/;

export type QuoteTransport = "plane" | "bus" | "ship" | "none";

export const QUOTE_TRANSPORT_LABELS: Record<QuoteTransport, string> = {
  plane: "Avión",
  bus: "Autobús",
  ship: "Barco",
  none: "Sin icono",
};

export type QuoteOpenSettings = {
  texts: Partial<Record<QuoteTextKey, string>>;
  // Sidebar "Métodos de pago": title (bold), detail, note (light blue, in parentheses).
  payment: QuoteIncludeItem[];
  layout: {
    // Built-in main sections plus custom section ids, in order.
    main: string[];
    aside: QuoteAsideSection[];
    // Built-in sections not shown (custom sections are removed instead).
    hidden: QuoteSectionId[];
  };
  sections: QuoteCustomSection[];
  transport: QuoteTransport;
};

// The same on every quote of the other types; Abierta starts from it and can change it.
export const QUOTE_PAYMENT_METHODS: { label: string; note?: string }[] = [
  { label: "Pago en efectivo directo en oficinas" },
  { label: "Transferencia bancaria" },
  { label: "Depósito en banco, Oxxo o Farmacias Guadalajara" },
  { label: "Tarjeta de crédito en oficina", note: "+ comisión bancaria" },
];

// Categories the first hotel of a new Abierta starts with; later hotels copy the names of
// the hotel above them.
export const DEFAULT_QUOTE_CATEGORIES = ["DOBLE", "TRIPLE", "MNR 5 A 12"];

// Per hotel.
export const QUOTE_MAX_CATEGORIES = 10;
export const QUOTE_MAX_CUSTOM_SECTIONS = 10;

// The same category names with no prices: a new hotel's starting list.
export function emptyRates(labels: string[] = DEFAULT_QUOTE_CATEGORIES): QuoteRate[] {
  return labels.map((label) => ({ label, price: "" }));
}

export function createDefaultOpenSettings(): QuoteOpenSettings {
  return {
    texts: {},
    payment: QUOTE_PAYMENT_METHODS.map(({ label, note }) => (note ? { detail: label, note } : { detail: label })),
    layout: { main: [...QUOTE_MAIN_SECTIONS], aside: [...QUOTE_ASIDE_SECTIONS], hidden: [] },
    sections: [],
    transport: "plane",
  };
}

export function cloneOpenSettings(open: QuoteOpenSettings): QuoteOpenSettings {
  return {
    texts: { ...open.texts },
    payment: open.payment.map((item) => ({ ...item })),
    layout: { main: [...open.layout.main], aside: [...open.layout.aside], hidden: [...open.layout.hidden] },
    sections: open.sections.map((section) => ({ ...section, items: section.items.map((item) => ({ ...item })) })),
    transport: open.transport,
  };
}

export function openText(open: QuoteOpenSettings, key: QuoteTextKey) {
  return open.texts[key] ?? QUOTE_TEXT_DEFAULTS[key];
}

// Typing the default back (or "Restaurar") drops the override.
export function setOpenText(open: QuoteOpenSettings, key: QuoteTextKey, value: string): QuoteOpenSettings {
  const texts = { ...open.texts };
  if (value === QUOTE_TEXT_DEFAULTS[key]) {
    delete texts[key];
  } else {
    texts[key] = value;
  }
  return { ...open, texts };
}

export function isSectionVisible(open: QuoteOpenSettings | undefined, id: string) {
  return !open || !open.layout.hidden.includes(id as QuoteSectionId);
}

export function visibleSections(open: QuoteOpenSettings, area: "main" | "aside") {
  return (open.layout[area] as string[]).filter((id) => isSectionVisible(open, id));
}

// Swaps the section with the next visible one above (-1) or below (1); hidden ones keep their place.
export function moveSection(open: QuoteOpenSettings, area: "main" | "aside", id: string, direction: 1 | -1) {
  const order = [...(open.layout[area] as string[])];
  const from = order.indexOf(id);
  let to = from + direction;
  while (to >= 0 && to < order.length && !isSectionVisible(open, order[to])) to += direction;
  if (from < 0 || to < 0 || to >= order.length) return open;
  [order[from], order[to]] = [order[to], order[from]];
  return { ...open, layout: { ...open.layout, [area]: order } };
}

export function setSectionHidden(open: QuoteOpenSettings, id: QuoteSectionId, hidden: boolean) {
  const rest = open.layout.hidden.filter((item) => item !== id);
  return { ...open, layout: { ...open.layout, hidden: hidden ? [...rest, id] : rest } };
}

// New sections go right before the closing block, or last when it isn't there.
export function addCustomSection(open: QuoteOpenSettings): QuoteOpenSettings {
  const id = `custom-${Date.now().toString(36)}`;
  const main = [...open.layout.main];
  const closing = main.indexOf("closing");
  main.splice(closing < 0 ? main.length : closing, 0, id);
  return {
    ...open,
    layout: { ...open.layout, main },
    sections: [...open.sections, { id, heading: "Nueva sección", label: "", marker: "check", items: [{}] }],
  };
}

export function removeCustomSection(open: QuoteOpenSettings, id: string): QuoteOpenSettings {
  return {
    ...open,
    layout: { ...open.layout, main: open.layout.main.filter((item) => item !== id) },
    sections: open.sections.filter((section) => section.id !== id),
  };
}

export function updateCustomSection(
  open: QuoteOpenSettings,
  id: string,
  changes: Partial<Omit<QuoteCustomSection, "id">>
): QuoteOpenSettings {
  return {
    ...open,
    sections: open.sections.map((section) => (section.id === id ? { ...section, ...changes } : section)),
  };
}

// Fields shown only inside a hidden section don't count in "Faltan". Mínimo por persona and
// "N días" are each typed in one of two sections, so they only drop out when both are hidden.
export function hiddenSectionFields(open: QuoteOpenSettings): QuoteTextField[] {
  const hidden = (id: QuoteSectionId) => !isSectionVisible(open, id);
  const fields: QuoteTextField[] = [];
  if (hidden("transport")) {
    fields.push(
      "destinationCode",
      "departureDate",
      "departureTime",
      "meetingPoint",
      "returnDate",
      "returnTime",
      "returnPoint"
    );
  }
  if (hidden("options")) fields.push("adults", "minors");
  if (hidden("deposit") && hidden("reserve")) fields.push("depositPerPerson");
  if (hidden("liquidation")) {
    fields.push("liquidationMonth", "liquidationDay", "liquidationYear");
    if (hidden("deposit")) fields.push("liquidationDays");
  }
  return fields;
}

// The amount a price starts with: "9,800" → 9800, "1,200C/U" → 1200. Null when it doesn't
// start with a number ("GRATIS", blank) or is 0.
export function priceAmount(price: string) {
  const match = /^\$?\s*(\d[\d,]*(?:\.\d+)?)/.exec(price.trim());
  if (!match) return null;
  const amount = Number(match[1].replace(/,/g, ""));
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

// What the sidebar summary shows for a hotel: its first category with a real price (usually
// DOBLE; the categories can be reordered), so it's never a kids' price picked as the cheapest.
export function summaryRate(rates: QuoteRate[]) {
  for (const rate of rates) {
    const amount = priceAmount(rate.price);
    if (amount !== null) return { label: rate.label.trim(), amount };
  }
  return null;
}

export const formatPriceAmount = (amount: number) =>
  new Intl.NumberFormat("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
