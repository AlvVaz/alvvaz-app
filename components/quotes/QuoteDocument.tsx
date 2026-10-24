import { Fragment } from "react";
import type { CSSProperties, HTMLAttributes, ReactNode } from "react";

import type { QuoteFonts } from "@/lib/quotes/fonts";
import {
  formatPriceAmount,
  isSectionVisible,
  openText,
  QUOTE_ASIDE_SECTIONS,
  QUOTE_MAIN_SECTIONS,
  QUOTE_PAYMENT_METHODS,
  QUOTE_TEXT_DEFAULTS,
  summaryRate,
  visibleSections,
  type QuoteCustomSection,
  type QuoteRowMarker,
  type QuoteTextKey,
  type QuoteTransport,
} from "@/lib/quotes/open";
import {
  formatMinorAges,
  getMinorAges,
  QUOTE_HIDDEN_FIELDS,
  quoteOptionLetter,
  type QuoteData,
  type QuoteIncludeItem,
  type QuoteOptionField,
  type QuoteTextField,
} from "@/lib/quotes/types";

// Started as a 1:1 port of docs/cotizaciones/cotizacion-template.html; the main
// column now shows one card per hotel option (A, B, C...) instead of one hotel.
// Font families come from QuoteFonts so the preview and the PDF can load them differently.

// Slots the admin editor fills with inline inputs. The PDF never passes this,
// so every value renders as plain text there.
export type QuoteDocumentEdit = {
  // `repeat` marks a value already editable in another spot: shown as plain text there.
  field: (field: QuoteTextField, repeat?: boolean) => ReactNode;
  option: (index: number, field: QuoteOptionField, repeat?: boolean) => ReactNode;
  optionStars: (index: number) => ReactNode;
  // Button on an option's card that removes it, and the green "+" next to the "Elige tu favorita" heading.
  removeOption: (index: number) => ReactNode;
  addOption: ReactNode;
  // The menores' ages in the sidebar's RESUMEN line (only rendered when there are menores).
  minorAges: ReactNode;
  // MXN / USD picker on the "COSTOS POR" header; the other currency labels mirror it.
  currency: ReactNode;
  // Wraps an "Incluye" item's rendered text in one field that edits all its parts.
  include: (index: number, content: ReactNode) => ReactNode;
  // Drag and drop (and Alt+↑/↓) handlers for an "Incluye" item's row.
  includeProps: (index: number) => HTMLAttributes<HTMLDivElement>;
  addInclude: ReactNode;
  // Abierta only (data.open); the other types never call the slots below.
  // One of the template's fixed texts (QUOTE_TEXT_DEFAULTS).
  text: (key: QuoteTextKey) => ReactNode;
  // An option's own note above its prices.
  optionNote: (index: number) => ReactNode;
  // One of an option's own price categories: its name and its price; "+" adds one to that option.
  rateLabel: (option: number, index: number) => ReactNode;
  ratePrice: (option: number, index: number) => ReactNode;
  addRate: (option: number) => ReactNode;
  // Picker around the SALIDA card's icon; REGRESO mirrors it.
  transport: (icon: ReactNode) => ReactNode;
  // A movable section with its ↑ / ↓ / hide (or remove) buttons.
  section: (id: string, area: "main" | "aside", content: ReactNode) => ReactNode;
  addSection: ReactNode;
  // A custom section's heading or the small label on its right.
  sectionText: (id: string, part: "heading" | "label") => ReactNode;
  // Rows of a custom section (by id) or of "payment" (Métodos de pago), edited like "Incluye" items.
  row: (list: string, index: number, content: ReactNode) => ReactNode;
  rowProps: (list: string, index: number) => HTMLAttributes<HTMLDivElement>;
  addRow: (list: string) => ReactNode;
};

type QuoteDocumentProps = {
  data: QuoteData;
  folio: string;
  logoSrc: string;
  fonts: QuoteFonts;
  className?: string;
  edit?: QuoteDocumentEdit;
};

// Undo the app's global CSS (Tailwind preflight, body classes) inside the quote
// so it renders like the standalone template with browser defaults.
export const QUOTE_DOCUMENT_RESET_CSS = `
.quote-document { line-height: normal; -webkit-font-smoothing: auto; -moz-osx-font-smoothing: auto; text-align: left; }
.quote-document * { box-sizing: content-box; }
`;

const SIDEBAR_BACKGROUND = "linear-gradient(180deg, #1d2a45 0%, #2b4d78 100%)";

// PDF only. A quote with more hotel options than fit on one page continues on the
// next: Chrome paginates the document and a fixed band (printed on every page) draws
// the dark column, so the sidebar itself is transparent and keeps page 1's height.
// If the sidebar runs longer (many options in the summary) it continues over the band
// with its padding repeated. Each column only stretches to its own content, so a longer
// sidebar doesn't push the main column's closing lines onto the next page (and vice
// versa). Needs a transparent <body> (see lib/quotes/render-pdf.ts).
export const QUOTE_DOCUMENT_PRINT_CSS = `
@media print {
  .quote-document { background: transparent !important; }
  .quote-aside { align-self: flex-start; min-height: 1056px; background: none !important; -webkit-box-decoration-break: clone; box-decoration-break: clone; }
  .quote-main { align-self: flex-start; min-height: 1056px; }
  body::before { content: ""; position: fixed; top: 0; left: 0; width: 236px; height: 1056px; background: ${SIDEBAR_BACKGROUND}; z-index: -1; }
}
`;

const label: CSSProperties = {
  fontSize: "9.5px",
  fontWeight: 700,
  letterSpacing: "0.18em",
  color: "#5d6b84",
};

const asideLabel: CSSProperties = { ...label, color: "#aab8d0" };

const sectionHeader: CSSProperties = {
  marginTop: "14px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  paddingBottom: "8px",
  borderBottom: "2px solid #1c2942",
  // A long title and label don't both fit: the label moves to its own line instead of
  // each wrapping in half (it's pushed right with marginLeft: auto).
  flexWrap: "wrap",
  columnGap: "16px",
  rowGap: "4px",
  // On a multi-page PDF, a header never ends a page without its first row.
  breakAfter: "avoid",
};

const optionCard: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "14px",
  padding: "8px 16px",
  border: "1px solid #d9e1ec",
  borderRadius: "12px",
  breakInside: "avoid",
};

const optionBadge: CSSProperties = {
  width: "32px",
  height: "32px",
  flexShrink: 0,
  borderRadius: "50%",
  color: "#ffffff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "16px",
  fontWeight: 700,
};

// Abierta: the "DOBLE: $15,000 | TRIPLE: $14,000" line under each hotel. Each price draws
// its "|" as a left border; the row is shifted left and its left edge clipped, so a price
// that wraps to the start of a line doesn't show one.
const categoryLine: CSSProperties = {
  marginTop: "4px",
  clipPath: "inset(-8px -8px -8px 0)",
  fontSize: "12px",
  fontWeight: 700,
  letterSpacing: "0.02em",
  lineHeight: 1.3,
  textTransform: "uppercase",
};

const categoryRow: CSSProperties = {
  marginLeft: "-17px",
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  rowGap: "2px",
};

// "$" before a price that starts with a number ("$9,800", "$1,200 C/U"), not before words
// like "GRATIS". While editing, an empty price keeps it so the field reads "$Precio".
const pricePrefix = (price: string, editing: boolean) =>
  /^\d/.test(price.trim()) || (editing && !price.trim()) ? "$" : "";

const categoryItem: CSSProperties = {
  marginLeft: "8px",
  paddingLeft: "8px",
  borderLeft: "1.5px solid #9aa7bd",
  whiteSpace: "nowrap",
};

// "**text**" parts are bold. Used for the texts an Abierta quote can change.
export function RichText({ text }: { text: string }) {
  return <>{text.split("**").map((part, index) => (index % 2 ? <b key={index}>{part}</b> : part))}</>;
}

// "Incluye" item: bold title, detail, then the note in red between parentheses.
function IncludeText({ item }: { item: QuoteIncludeItem }) {
  return (
    <>
      {item.title ? (
        <>
          <b>{item.title}</b>{" "}
        </>
      ) : null}
      {item.detail}
      {item.note ? (
        <>
          {" "}
          <span style={{ color: "#c0174f", fontWeight: 600 }}>({item.note})</span>
        </>
      ) : null}
    </>
  );
}

// Abierta "Métodos de pago" row: like an "Incluye" item, with the note in light blue.
function PaymentText({ item }: { item: QuoteIncludeItem }) {
  return (
    <>
      {item.title ? (
        <>
          <b>{item.title}</b>{" "}
        </>
      ) : null}
      {item.detail}
      {item.note ? <span style={{ color: "#8fc1f0" }}> ({item.note})</span> : null}
    </>
  );
}

const CHECK_ICON = (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#1f9a6b"
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    style={{ flexShrink: 0, marginTop: "1px" }}
  >
    <path d="M5 12l5 5 9-10" />
  </svg>
);

// Marker before each row of a custom section.
function RowMarker({ marker }: { marker: QuoteRowMarker }) {
  if (marker === "check") return CHECK_ICON;
  if (marker === "dot") {
    return (
      <span
        aria-hidden="true"
        style={{ width: "6px", height: "6px", flexShrink: 0, marginTop: "6px", borderRadius: "50%", background: "#1f9a6b" }}
      />
    );
  }
  return null;
}

// SALIDA / REGRESO card icon: a plane (taking off / landing) for aéreo and internacional,
// a bus for terrestre; Abierta picks any of them, a ship, or none.
function TransportIcon({ mode, direction }: { mode: QuoteTransport; direction: "out" | "back" }) {
  if (mode === "none") return null;
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#2f6db5"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {mode === "bus" ? (
        <>
          <rect x="4" y="3" width="16" height="14" rx="2" />
          <path d="M4 11h16M8 21v-4M16 21v-4" />
          <circle cx="8" cy="14" r="0.5" />
          <circle cx="16" cy="14" r="0.5" />
        </>
      ) : mode === "ship" ? (
        // Lucide "ship" (ISC license).
        <>
          <path d="M12 2v2" />
          <path d="M12 9.189V13" />
          <path d="M19 12V6a2 2 0 00-2-2H7a2 2 0 00-2 2v6" />
          <path d="M19.38 19A11.6 11.6 0 0021 13l-8.188-3.639a2 2 0 00-1.624 0L3 13.001a11.6 11.6 0 002.81 7.76" />
          <path d="M2 20c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1s1.2 1 2.5 1c2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
        </>
      ) : (
        <>
          <path
            d={
              direction === "out"
                ? "M2 16l20-6-2-3-7 2-6-5-2 1 4 6-5 1.5-2-2-1.5.5z"
                : "M22 16L2 10l2-3 7 2 6-5 2 1-4 6 5 1.5 2-2 1.5.5z"
            }
          />
          <path d="M3 20h18" />
        </>
      )}
    </svg>
  );
}

// Option badges: navy, blue, light blue for A, B, C, then the same again for D, E, F...
const OPTION_COLORS = ["#1c2942", "#2f6db5", "#5b9bd5"];

const flightCard: CSSProperties = {
  background: "#f4f7fb",
  borderRadius: "12px",
  padding: "11px 14px",
  display: "flex",
  gap: "12px",
  alignItems: "center",
};

const flightLabel: CSSProperties = {
  fontSize: "9.5px",
  fontWeight: 700,
  letterSpacing: "0.16em",
  color: "#5d6b84",
};

const sectionTitle = (display: string): CSSProperties => ({
  margin: 0,
  fontFamily: display,
  fontWeight: 700,
  fontSize: "19px",
});

export function QuoteDocument({ data, folio, logoSrc, fonts, className, edit }: QuoteDocumentProps) {
  const display = fonts.display;
  // Each value is an input only once; pass `repeat` for every other place it shows.
  const f = (field: QuoteTextField, repeat = false) => (edit ? edit.field(field, repeat) : data[field]);
  const opt = (index: number, field: QuoteOptionField, repeat = false) =>
    edit ? edit.option(index, field, repeat) : data.options[index][field];

  // Abierta only: its own texts, section order, prices per category and transport icon.
  // The other types always render the defaults, exactly as before Abierta existed.
  const open = data.open;
  const t = (key: QuoteTextKey) =>
    open && edit ? edit.text(key) : <RichText text={open ? openText(open, key) : QUOTE_TEXT_DEFAULTS[key]} />;
  const wrap = (id: string, area: "main" | "aside", content: ReactNode) =>
    open && edit ? edit.section(id, area, content) : content;
  // With the deposit note hidden, Mínimo por persona is typed in Reserva con instead; with
  // the liquidation block hidden, the "N días" are typed in the deposit note.
  const perPersonInReserve = !isSectionVisible(open, "deposit");
  const daysInDeposit = !isSectionVisible(open, "liquidation");

  // "2 ADULTOS Y 1 MENOR". Menores only shows when there are any, except at the
  // header input while editing, so it can be filled in.
  const minors = Number.parseInt(data.minors, 10) || 0;
  const minorAgesText = formatMinorAges(getMinorAges(data));
  // Internacional has no flight times (QUOTE_HIDDEN_FIELDS).
  const hiddenFields = QUOTE_HIDDEN_FIELDS[data.kind];
  const adults = Number.parseInt(data.adults, 10);
  const plural = (value: string, one: string, many: string) => (value.trim() === "1" ? one : many);
  const party = (isInput: boolean) => (
    <>
      {f("adults", !isInput)} {plural(data.adults, "ADULTO", "ADULTOS")}
      {(edit && isInput) || minors > 0 ? (
        <>
          {" "}
          Y {f("minors", !isInput)} {plural(data.minors, "MENOR", "MENORES")}
        </>
      ) : null}
    </>
  );
  // Abierta prices per person, so the people are optional there: shown once Adultos is typed.
  const showParty = !open || Boolean(data.adults.trim());
  // Adultos + menores; until Adultos is a number, falls back to mirroring it.
  const passengers = Number.isNaN(adults) ? "" : String(adults + minors);
  // Abierta's optional fields (flight times, meeting points) only print when filled.
  const showOptional = (field: QuoteTextField) => !open || Boolean(edit) || Boolean(data[field].trim());
  const transport: QuoteTransport = open ? open.transport : data.kind === "terrestre" ? "bus" : "plane";

  const asideSection = (id: string): ReactNode => {
    switch (id) {
      case "summary":
        return (
          <>
            {/* With menores: "RESUMEN · 2 ADULTOS Y 2 MENORES (5 Y 8 AÑOS) (MXN)"; the editor shows a field for the ages. */}
            <div style={{ ...asideLabel, marginTop: "16px" }}>
              {t("summaryLabel")}
              {showParty ? (
                <>
                  {" "}
                  · {party(false)}
                  {minors > 0 ? (edit ? <> {edit.minorAges}</> : minorAgesText ? ` (${minorAgesText})` : null) : null}
                </>
              ) : null}{" "}
              ({data.currency})
            </div>
            <div style={{ marginTop: "4px" }}>
              {data.options.map((option, index) => {
                // Abierta: the hotel's first category with a price ("DOBLE $9,800.00").
                const rate = open ? summaryRate(option.rates ?? []) : null;
                return (
                  <div
                    key={index}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "8px",
                      fontSize: "12.5px",
                      padding: "5px 0",
                      borderBottom: "1px solid rgba(255,255,255,0.14)",
                    }}
                  >
                    <span style={{ color: "#dbe3f0", ...(open ? { whiteSpace: "nowrap" } : null) }}>
                      {t("summaryOption")} {quoteOptionLetter(index)}
                    </span>
                    <span style={{ fontWeight: 700, ...(open ? { textAlign: "right" } : null) }}>
                      {open ? (
                        rate ? (
                          <>
                            {rate.label} ${formatPriceAmount(rate.amount)}
                          </>
                        ) : null
                      ) : (
                        <>${opt(index, "totalPrice", true)}.00</>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        );
      case "reserve": {
        // Abierta without people: Reserva con is just the amount per person.
        const perPersonOnly = !showParty;
        return (
          <div
            style={{
              marginTop: "14px",
              background: "#ffffff",
              borderRadius: "16px",
              padding: "18px 18px 16px",
              color: "#1c2942",
              breakInside: "avoid",
            }}
          >
            <div style={label}>{t("reserveLabel")}</div>
            <div
              style={{
                marginTop: "6px",
                display: "flex",
                flexWrap: "wrap",
                alignItems: "baseline",
                gap: "5px",
              }}
            >
              {/* Calculated from Mínimo por persona × pasajeros (lib/quotes/derived.ts), never typed. */}
              <span style={{ fontSize: "28px", fontWeight: 800, whiteSpace: "nowrap" }}>
                ${perPersonOnly ? f("depositPerPerson", !perPersonInReserve) : f("depositTotal", true)}
              </span>
              <span style={{ fontSize: "10px", fontWeight: 700, color: "#5d6b84" }}>{data.currency}</span>
            </div>
            <div style={{ marginTop: "4px", fontSize: "11px", color: "#5d6b84" }}>
              {perPersonOnly ? (
                t("reserveEach")
              ) : (
                <>
                  ${f("depositPerPerson", !perPersonInReserve)} {t("reservePerPerson")}
                </>
              )}
            </div>
          </div>
        );
      }
      case "liquidation":
        return (
          <div style={{ marginTop: "14px", display: "flex", gap: "12px", alignItems: "flex-start", breakInside: "avoid" }}>
            <div
              style={{
                width: "48px",
                flexShrink: 0,
                borderRadius: "6px",
                overflow: "hidden",
                background: "#ffffff",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  background: "#3f8ec9",
                  color: "#ffffff",
                  fontSize: "9px",
                  fontWeight: 800,
                  letterSpacing: "0.12em",
                  padding: "3px 0",
                }}
              >
                {f("liquidationMonth")}
              </div>
              <div
                style={{
                  color: "#1c2942",
                  fontSize: "20px",
                  fontWeight: 800,
                  lineHeight: 1.1,
                  paddingTop: "2px",
                }}
              >
                {f("liquidationDay")}
              </div>
              <div style={{ color: "#5d6b84", fontSize: "8.5px", fontWeight: 700, paddingBottom: "4px" }}>
                {f("liquidationYear")}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "12.5px", fontWeight: 700 }}>{t("liquidationTitle")}</div>
              <div style={{ marginTop: "2px", fontSize: "11px", lineHeight: 1.4, color: "#dbe3f0" }}>
                {f("liquidationDays")} {plural(data.liquidationDays, "día", "días")} {t("liquidationNote")}
              </div>
            </div>
          </div>
        );
      case "payment":
        // Compact on purpose: the sidebar has to fit about four options on one page.
        return (
          <div style={{ marginTop: "16px", breakInside: "avoid" }}>
            {open && edit ? (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={asideLabel}>{t("paymentLabel")}</div>
                {edit.addRow("payment")}
              </div>
            ) : (
              <div style={asideLabel}>{t("paymentLabel")}</div>
            )}
            <div style={{ marginTop: "2px" }}>
              {open
                ? open.payment.map((item, index) => (
                    <div
                      key={index}
                      {...edit?.rowProps("payment", index)}
                      style={{
                        padding: "3px 0",
                        borderBottom: "1px solid rgba(255,255,255,0.14)",
                        fontSize: "10px",
                        lineHeight: 1.35,
                        color: "#dbe3f0",
                      }}
                    >
                      {edit ? (
                        <span className="quote-include-body" style={{ display: "inline-block" }}>
                          {edit.row("payment", index, <PaymentText item={item} />)}
                        </span>
                      ) : (
                        <PaymentText item={item} />
                      )}
                    </div>
                  ))
                : QUOTE_PAYMENT_METHODS.map((method) => (
                    <div
                      key={method.label}
                      style={{
                        padding: "3px 0",
                        borderBottom: "1px solid rgba(255,255,255,0.14)",
                        fontSize: "10px",
                        lineHeight: 1.35,
                        color: "#dbe3f0",
                      }}
                    >
                      {method.label}
                      {method.note ? <span style={{ color: "#8fc1f0" }}> ({method.note})</span> : null}
                    </div>
                  ))}
            </div>
          </div>
        );
      case "brand":
        return (
          <>
            <div style={{ fontFamily: display, fontStyle: "italic", fontSize: "17px", lineHeight: 1.35 }}>
              {t("tagline")}
            </div>
            <div style={{ marginTop: "12px", fontSize: "9.5px", lineHeight: 1.55, color: "#aab8d0" }}>
              {t("address1")}
              <br />
              {t("address2")}
              <br />
              {t("address3")}
            </div>
          </>
        );
      default:
        return null;
    }
  };

  // Abierta hotel card: hotel and stars, its optional note, then the price per category (no
  // room or plan line; the categories already say the room).
  const openOptionCard = (index: number) => {
    const option = data.options[index];
    const rates = option.rates ?? [];
    // On the PDF, a category without a price is left out.
    const shown = rates.map((_, rate) => rate).filter((rate) => edit || rates[rate].price.trim());
    return (
      <>
        {edit || option.note?.trim() ? (
          <div style={{ ...label, marginTop: "3px", textTransform: "uppercase" }}>
            {edit ? edit.optionNote(index) : option.note}
          </div>
        ) : null}
        {shown.length || edit ? (
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <div style={{ ...categoryLine, flexGrow: 1, minWidth: 0 }}>
              <div style={categoryRow}>
                {shown.map((rate) => (
                  <span key={rate} style={categoryItem}>
                    {edit ? edit.rateLabel(index, rate) : rates[rate].label}:{" "}
                    {pricePrefix(rates[rate].price, Boolean(edit))}
                    {edit ? edit.ratePrice(index, rate) : rates[rate].price}
                  </span>
                ))}
              </div>
            </div>
            {/* Editor only: fixed at the right end of the card's price line, whatever the prices wrap to. */}
            {edit ? <span style={{ flexShrink: 0, marginTop: "4px" }}>{edit.addRate(index)}</span> : null}
          </div>
        ) : null}
      </>
    );
  };

  const customSection = (section: QuoteCustomSection) => (
    <>
      <div style={sectionHeader}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <h2 style={sectionTitle(display)}>
            {edit ? edit.sectionText(section.id, "heading") : <RichText text={section.heading} />}
          </h2>
          {edit ? edit.addRow(section.id) : null}
        </div>
        {edit || section.label.trim() ? (
          <span style={{ ...label, marginLeft: "auto" }}>
            {edit ? edit.sectionText(section.id, "label") : <RichText text={section.label} />}
          </span>
        ) : null}
      </div>
      <div
        style={{
          marginTop: "6px",
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          columnGap: "24px",
        }}
      >
        {section.items.map((item, index) => (
          <div
            key={index}
            {...edit?.rowProps(section.id, index)}
            style={{ padding: "8px 0", borderBottom: "1px solid #e3e9f1", breakInside: "avoid" }}
          >
            <div
              className={edit ? "quote-include-body" : undefined}
              style={{ display: "flex", gap: "10px", width: "fit-content", fontSize: "12px", lineHeight: 1.4 }}
            >
              <RowMarker marker={section.marker} />
              <span>
                {edit ? edit.row(section.id, index, <IncludeText item={item} />) : <IncludeText item={item} />}
              </span>
            </div>
          </div>
        ))}
      </div>
    </>
  );

  const mainSection = (id: string): ReactNode => {
    switch (id) {
      case "transport":
        return (
          <div
            style={{
              marginTop: "16px",
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: "10px",
            }}
          >
            <div style={flightCard}>
              {open && edit ? (
                edit.transport(<TransportIcon mode={transport} direction="out" />)
              ) : (
                <TransportIcon mode={transport} direction="out" />
              )}
              <div>
                <div style={flightLabel}>
                  {t("departureLabel")} · {f("originCode", true)} → {f("destinationCode")}
                </div>
                <div style={{ marginTop: "2px", fontSize: "14px", fontWeight: 700 }}>
                  {f("departureDate")}
                  {hiddenFields.includes("departureTime") || !showOptional("departureTime") ? null : (
                    <> · {f("departureTime")}</>
                  )}
                </div>
                {/* Terrestre and Abierta; hidden on the PDF when empty, always editable in the editor. */}
                {(data.kind === "terrestre" || open) && (edit || data.meetingPoint.trim()) ? (
                  <div style={{ marginTop: "3px", fontSize: "11px", lineHeight: 1.35, color: "#5d6b84" }}>
                    {t("meetingPointLabel")}{" "}
                    <span style={{ color: "#1c2942", fontWeight: 600 }}>{f("meetingPoint")}</span>
                  </div>
                ) : null}
              </div>
            </div>
            <div style={flightCard}>
              <TransportIcon mode={transport} direction="back" />
              <div>
                <div style={flightLabel}>
                  {t("returnLabel")} · {f("destinationCode", true)} → {f("originCode", true)}
                </div>
                <div style={{ marginTop: "2px", fontSize: "14px", fontWeight: 700 }}>
                  {f("returnDate")}
                  {hiddenFields.includes("returnTime") || !showOptional("returnTime") ? null : (
                    <> · {f("returnTime")}</>
                  )}
                </div>
                {/* Same as Punto de salida: terrestre and Abierta, hidden on the PDF when empty. */}
                {(data.kind === "terrestre" || open) && (edit || data.returnPoint.trim()) ? (
                  <div style={{ marginTop: "3px", fontSize: "11px", lineHeight: 1.35, color: "#5d6b84" }}>
                    {t("returnPointLabel")}{" "}
                    <span style={{ color: "#1c2942", fontWeight: 600 }}>{f("returnPoint")}</span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        );
      case "options":
        return (
          <>
            <div style={sectionHeader}>
              {/* The editor's green "+" (add option) sits right after the title. */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <h2 style={sectionTitle(display)}>{t("optionsHeading")}</h2>
                {edit ? edit.addOption : null}
              </div>
              <span style={{ ...label, marginLeft: "auto" }}>
                {open ? (
                  <>
                    {t("optionsLabel")}
                    {edit || showParty ? <> · {party(true)}</> : null} · {edit ? edit.currency : data.currency}
                  </>
                ) : (
                  <>
                    COSTOS POR {party(true)} · {edit ? edit.currency : data.currency}
                  </>
                )}
              </span>
            </div>
            <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "6px" }}>
              {data.options.map((option, index) => (
                <div key={index} style={optionCard}>
                  <span
                    style={{ ...optionBadge, fontFamily: display, background: OPTION_COLORS[index % OPTION_COLORS.length] }}
                  >
                    {quoteOptionLetter(index)}
                  </span>
                  <div style={{ flexGrow: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "center",
                        columnGap: "8px",
                        fontSize: "15px",
                        fontWeight: 700,
                        lineHeight: 1.3,
                      }}
                    >
                      <span>{opt(index, "hotelName")}</span>
                      {edit ? (
                        edit.optionStars(index)
                      ) : (
                        <span style={{ display: "flex", gap: "2px" }} role="img" aria-label="Categoría del hotel">
                          {Array.from({ length: option.stars }, (_, star) => (
                            <svg key={star} width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M12 2l3 6.6 7 .7-5.3 4.8 1.6 7L12 17.5 5.7 21.1l1.6-7L2 9.3l7-.7z" fill="#e3a325" />
                            </svg>
                          ))}
                        </span>
                      )}
                    </div>
                    {open ? (
                      openOptionCard(index)
                    ) : (
                      <div style={{ marginTop: "2px", fontSize: "11px", color: "#5d6b84" }}>
                        {t("roomLabel")} {opt(index, "roomType")}
                        {edit || option.plan.trim() ? <> · {opt(index, "plan")}</> : null}
                      </div>
                    )}
                  </div>
                  {/* Abierta prices per category under the hotel instead of one total here. */}
                  {open ? null : (
                    <div style={{ flexShrink: 0, textAlign: "right" }}>
                      <div style={{ fontSize: "19px", fontWeight: 800, whiteSpace: "nowrap" }}>
                        ${opt(index, "totalPrice")}
                      </div>
                      <div style={{ fontSize: "10px", color: "#5d6b84", whiteSpace: "nowrap" }}>
                        {passengers === "1" ? "por 1 pasajero" : <>por los {passengers || f("adults", true)} pasajeros</>}
                      </div>
                    </div>
                  )}
                  {edit ? edit.removeOption(index) : null}
                </div>
              ))}
            </div>
          </>
        );
      case "includes":
        return (
          <>
            <div style={sectionHeader}>
              {/* The editor's "+" (add item) sits right after the title. */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <h2 style={sectionTitle(display)}>{t("includesHeading")}</h2>
                {edit ? edit.addInclude : null}
              </div>
              <span style={{ ...label, marginLeft: "auto" }}>{t("includesLabel")}</span>
            </div>
            <div
              style={{
                marginTop: "6px",
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                columnGap: "24px",
              }}
            >
              {data.includes.map((item, index) => (
                <div
                  key={index}
                  {...edit?.includeProps(index)}
                  style={{ padding: "8px 0", borderBottom: "1px solid #e3e9f1", breakInside: "avoid" }}
                >
                  {/* fit-content so the editor's hover box hugs the text; no visual change on the PDF */}
                  <div
                    className={edit ? "quote-include-body" : undefined}
                    style={{ display: "flex", gap: "10px", width: "fit-content", fontSize: "12px", lineHeight: 1.4 }}
                  >
                    {CHECK_ICON}
                    <span>
                      {edit ? edit.include(index, <IncludeText item={item} />) : <IncludeText item={item} />}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        );
      case "deposit":
        return (
          <div
            style={{
              marginTop: "12px",
              display: "flex",
              gap: "14px",
              padding: "10px 0",
              borderTop: "1px solid #e3e9f1",
              borderBottom: "1px solid #e3e9f1",
              fontSize: "12px",
              lineHeight: 1.5,
              breakInside: "avoid",
            }}
          >
            <span style={{ fontFamily: display, fontSize: "16px", color: "#3f8ec9", width: "12px" }}>1</span>
            {open ? (
              <span>
                {t("depositStart")} <b>${f("depositPerPerson")}</b> {t("depositAmount")} {t("depositMiddle")}{" "}
                <b>
                  {f("liquidationDays", !daysInDeposit)} {plural(data.liquidationDays, "día", "días")}
                </b>{" "}
                {t("depositEnd")}
              </span>
            ) : (
              <span>
                Con <b>${f("depositPerPerson")} como mínimo por persona</b> podemos reservar, y estar dando el
                resto poco a poco, <b>semanal, quincenal o mensual</b>. Teniendo que estar{" "}
                <b>
                  liquidado {f("liquidationDays", true)} {plural(data.liquidationDays, "día", "días")} antes del viaje
                </b>
                .
              </span>
            )}
          </div>
        );
      case "closing":
        return (
          // The closing lines stay together when the PDF runs onto another page.
          <div style={{ breakInside: "avoid" }}>
            <div
              style={{
                background: "#fdecf1",
                borderRadius: "12px",
                padding: "12px 16px",
                fontSize: "11.5px",
                lineHeight: 1.45,
                color: "#8f1239",
              }}
            >
              {t("closingNote")}
            </div>
            <div
              style={{
                marginTop: "8px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontFamily: display, fontStyle: "italic", fontSize: "14px", color: "#2f6db5" }}>
                {t("closingThanks")}
              </span>
              <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em", color: "#5d6b84" }}>
                {t("closingBrand")}
              </span>
            </div>
            <div style={{ marginTop: "6px", fontSize: "10px", color: "#5d6b84" }}>{t("closingPolicies")}</div>
          </div>
        );
      default: {
        const custom = open?.sections.find((section) => section.id === id);
        return custom ? customSection(custom) : null;
      }
    }
  };

  const asideOrder: readonly string[] = open ? visibleSections(open, "aside") : QUOTE_ASIDE_SECTIONS;
  const mainOrder: readonly string[] = open ? visibleSections(open, "main") : QUOTE_MAIN_SECTIONS;

  return (
    <div
      className={["quote-document", className].filter(Boolean).join(" ")}
      style={{
        width: "816px",
        // At least one letter page. More hotel options than fit make it taller and the
        // PDF continues on a second page (QUOTE_DOCUMENT_PRINT_CSS). Editing also adds
        // things the PDF doesn't have (hints, the "+" add buttons, Tel.).
        minHeight: "1056px",
        display: "flex",
        fontFamily: fonts.body,
        color: "#1c2942",
        background: "#ffffff",
        ...(edit ? { overflow: "hidden" } : null),
      }}
    >
      <aside
        className="quote-aside"
        style={{
          width: "236px",
          flexShrink: 0,
          boxSizing: "border-box",
          padding: "40px 28px 28px",
          background: SIDEBAR_BACKGROUND,
          color: "#ffffff",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            width: "140px",
            height: "140px",
            // Centered in the sidebar: the same space on its left and right.
            alignSelf: "center",
            borderRadius: "50%",
            background: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            boxSizing: "border-box",
          }}
        >
          {/* The PNG has wide empty margins, so it's drawn wider than the circle (which clips
              the blank edges) to make the logo fill ~86% of it; marginTop re-centers the art,
              which sits slightly high in the file. */}
          {/* eslint-disable-next-line @next/next/no-img-element -- must render identically in the server-side PDF */}
          <img
            src={logoSrc}
            alt="AlvVaz Agencia de Viajes"
            style={{ width: "165px", height: "auto", flexShrink: 0, marginTop: "8px" }}
          />
        </div>

        <div style={{ ...asideLabel, marginTop: "28px" }}>{t("folioLabel")}</div>
        <div style={{ marginTop: "4px", fontSize: "30px", fontWeight: 800, letterSpacing: "0.02em" }}>
          #{folio}
        </div>

        <div style={{ ...asideLabel, marginTop: "16px" }}>{t("quoteDateLabel")}</div>
        <div style={{ marginTop: "4px", fontSize: "13.5px", fontWeight: 700 }}>{f("quoteDate")}</div>

        <div style={{ ...asideLabel, marginTop: "14px" }}>{t("travelDatesLabel")}</div>
        <div style={{ marginTop: "4px", fontSize: "13.5px", fontWeight: 700 }}>{f("travelDates")}</div>

        <div style={{ marginTop: "16px", height: "1px", background: "rgba(255,255,255,0.18)" }} />

        {/* Summary, Reserva con, Liquidación, Métodos de pago, then the agency at the bottom.
            Abierta can reorder or hide them. */}
        {asideOrder.map((id) => (
          <Fragment key={id}>
            {id === "brand" ? <div style={{ flexGrow: 1 }} /> : null}
            {wrap(id, "aside", asideSection(id))}
          </Fragment>
        ))}
      </aside>

      <main
        className="quote-main"
        style={{
          flexGrow: 1,
          boxSizing: "border-box",
          padding: "28px 40px 28px",
          display: "flex",
          flexDirection: "column",
          // Repeats the top and bottom padding on every PDF page.
          boxDecorationBreak: "clone",
          WebkitBoxDecorationBreak: "clone",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontFamily: fonts.title,
            fontWeight: 800,
            fontSize: "40px",
            lineHeight: 1.05,
            textTransform: "uppercase",
            color: "#1c2942",
          }}
        >
          {f("title")}
        </h1>
        <div style={{ marginTop: "6px", fontFamily: display, fontStyle: "italic", fontSize: "15px", color: "#5d6b84" }}>
          {f("nights")} {t("subtitle")} {f("originCode")}
        </div>

        <div
          style={{
            marginTop: "20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: "16px",
            paddingBottom: "12px",
            borderBottom: "1px solid #d9e1ec",
          }}
        >
          <div>
            <div style={label}>{t("clientLabel")}</div>
            <div style={{ marginTop: "4px", fontFamily: display, fontWeight: 700, fontSize: "20px" }}>
              {f("clientName")}
            </div>
            {/* The client's phone is for the agency only: shown while editing, never on the PDF. */}
            {edit ? (
              <div style={{ marginTop: "4px", fontSize: "12px", color: "#5d6b84" }}>Tel. {f("clientPhone")}</div>
            ) : null}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={label}>{t("vendorLabel")}</div>
            <div style={{ marginTop: "4px", fontSize: "13.5px", fontWeight: 600 }}>{f("vendorName")}</div>
          </div>
        </div>

        {/* Salida / Regreso, options, Incluye, the deposit note, then the closing lines at the
            bottom. Abierta can reorder or hide them and add its own sections. */}
        {mainOrder.map((id) => (
          <Fragment key={id}>
            {id === "closing" ? <div style={{ flexGrow: 1, minHeight: "12px" }} /> : null}
            {wrap(id, "main", mainSection(id))}
          </Fragment>
        ))}
        {open && edit ? edit.addSection : null}
      </main>
    </div>
  );
}
