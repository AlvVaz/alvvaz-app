import type { CSSProperties, HTMLAttributes, ReactNode } from "react";

import type { QuoteFonts } from "@/lib/quotes/fonts";
import {
  formatMinorAges,
  getMinorAges,
  QUOTE_HIDDEN_FIELDS,
  quoteOptionLetter,
  type QuoteData,
  type QuoteIncludeItem,
  type QuoteKind,
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

// SALIDA / REGRESO card icon: a plane (taking off / landing) for aéreo and internacional,
// a bus for terrestre.
function TransportIcon({ kind, direction }: { kind: QuoteKind; direction: "out" | "back" }) {
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
      {kind === "terrestre" ? (
        <>
          <rect x="4" y="3" width="16" height="14" rx="2" />
          <path d="M4 11h16M8 21v-4M16 21v-4" />
          <circle cx="8" cy="14" r="0.5" />
          <circle cx="16" cy="14" r="0.5" />
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

// Sidebar "Métodos de pago": the same on every quote, not editable.
const PAYMENT_METHODS: { label: string; note?: string }[] = [
  { label: "Pago en efectivo directo en oficinas" },
  { label: "Transferencia bancaria" },
  { label: "Depósito en banco, Oxxo o Farmacias Guadalajara" },
  { label: "Tarjeta de crédito en oficina", note: "+ comisión bancaria" },
];

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

export function QuoteDocument({ data, folio, logoSrc, fonts, className, edit }: QuoteDocumentProps) {
  const display = fonts.display;
  // Each value is an input only once; pass `repeat` for every other place it shows.
  const f = (field: QuoteTextField, repeat = false) => (edit ? edit.field(field, repeat) : data[field]);
  const opt = (index: number, field: QuoteOptionField, repeat = false) =>
    edit ? edit.option(index, field, repeat) : data.options[index][field];

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
  // Adultos + menores; until Adultos is a number, falls back to mirroring it.
  const passengers = Number.isNaN(adults) ? "" : String(adults + minors);

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

        <div style={{ ...asideLabel, marginTop: "28px" }}>COTIZACIÓN</div>
        <div style={{ marginTop: "4px", fontSize: "30px", fontWeight: 800, letterSpacing: "0.02em" }}>
          #{folio}
        </div>

        <div style={{ ...asideLabel, marginTop: "16px" }}>FECHA DE COTIZACIÓN</div>
        <div style={{ marginTop: "4px", fontSize: "13.5px", fontWeight: 700 }}>{f("quoteDate")}</div>

        <div style={{ ...asideLabel, marginTop: "14px" }}>FECHAS DE VIAJE</div>
        <div style={{ marginTop: "4px", fontSize: "13.5px", fontWeight: 700 }}>{f("travelDates")}</div>

        <div style={{ marginTop: "16px", height: "1px", background: "rgba(255,255,255,0.18)" }} />

        {/* With menores: "RESUMEN · 2 ADULTOS Y 2 MENORES (5 Y 8 AÑOS) (MXN)"; the editor shows a field for the ages. */}
        <div style={{ ...asideLabel, marginTop: "16px" }}>
          RESUMEN · {party(false)}
          {minors > 0 ? (edit ? <> {edit.minorAges}</> : minorAgesText ? ` (${minorAgesText})` : null) : null} (
          {data.currency})
        </div>
        <div style={{ marginTop: "4px" }}>
          {data.options.map((_, index) => (
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
              <span style={{ color: "#dbe3f0" }}>Opción {quoteOptionLetter(index)}</span>
              <span style={{ fontWeight: 700 }}>${opt(index, "totalPrice", true)}.00</span>
            </div>
          ))}
        </div>

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
          <div style={label}>RESERVA CON</div>
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
              ${f("depositTotal", true)}
            </span>
            <span style={{ fontSize: "10px", fontWeight: 700, color: "#5d6b84" }}>{data.currency}</span>
          </div>
          <div style={{ marginTop: "4px", fontSize: "11px", color: "#5d6b84" }}>
            ${f("depositPerPerson", true)} mínimo por persona
          </div>
        </div>

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
            <div style={{ fontSize: "12.5px", fontWeight: 700 }}>Liquidación del viaje</div>
            <div style={{ marginTop: "2px", fontSize: "11px", lineHeight: 1.4, color: "#dbe3f0" }}>
              {f("liquidationDays")} {plural(data.liquidationDays, "día", "días")} antes de la salida. Abona
              semanal, quincenal o mensual.
            </div>
          </div>
        </div>

        {/* Compact on purpose: the sidebar has to fit about four options on one page. */}
        <div style={{ marginTop: "16px", breakInside: "avoid" }}>
          <div style={asideLabel}>MÉTODOS DE PAGO</div>
          <div style={{ marginTop: "2px" }}>
            {PAYMENT_METHODS.map((method) => (
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

        <div style={{ flexGrow: 1 }} />
        <div style={{ fontFamily: display, fontStyle: "italic", fontSize: "17px", lineHeight: 1.35 }}>
          Más de 10 años nos respaldan
        </div>
        <div style={{ marginTop: "12px", fontSize: "9.5px", lineHeight: 1.55, color: "#aab8d0" }}>
          Agencia de Viajes Alvvaz
          <br />
          Hernán Cortés #508-A, Col. Industrial Aviación
          <br />
          Calle 30 #689, Villas del Sol
        </div>
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
          {f("nights")} noches con salida desde {f("originCode")}
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
            <div style={label}>PREPARADA PARA</div>
            <div style={{ marginTop: "4px", fontFamily: display, fontWeight: 700, fontSize: "20px" }}>
              {f("clientName")}
            </div>
            {/* The client's phone is for the agency only: shown while editing, never on the PDF. */}
            {edit ? (
              <div style={{ marginTop: "4px", fontSize: "12px", color: "#5d6b84" }}>Tel. {f("clientPhone")}</div>
            ) : null}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={label}>VENDEDOR</div>
            <div style={{ marginTop: "4px", fontSize: "13.5px", fontWeight: 600 }}>{f("vendorName")}</div>
          </div>
        </div>

        <div
          style={{
            marginTop: "16px",
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: "10px",
          }}
        >
          <div style={flightCard}>
            <TransportIcon kind={data.kind} direction="out" />
            <div>
              <div style={flightLabel}>
                SALIDA · {f("originCode", true)} → {f("destinationCode")}
              </div>
              <div style={{ marginTop: "2px", fontSize: "14px", fontWeight: 700 }}>
                {f("departureDate")}
                {hiddenFields.includes("departureTime") ? null : <> · {f("departureTime")}</>}
              </div>
              {/* Terrestre only; hidden on the PDF when empty, always editable in the editor. */}
              {data.kind === "terrestre" && (edit || data.meetingPoint.trim()) ? (
                <div style={{ marginTop: "3px", fontSize: "11px", lineHeight: 1.35, color: "#5d6b84" }}>
                  Punto de salida: <span style={{ color: "#1c2942", fontWeight: 600 }}>{f("meetingPoint")}</span>
                </div>
              ) : null}
            </div>
          </div>
          <div style={flightCard}>
            <TransportIcon kind={data.kind} direction="back" />
            <div>
              <div style={flightLabel}>
                REGRESO · {f("destinationCode", true)} → {f("originCode", true)}
              </div>
              <div style={{ marginTop: "2px", fontSize: "14px", fontWeight: 700 }}>
                {f("returnDate")}
                {hiddenFields.includes("returnTime") ? null : <> · {f("returnTime")}</>}
              </div>
              {/* Same as Punto de salida: terrestre only, hidden on the PDF when empty. */}
              {data.kind === "terrestre" && (edit || data.returnPoint.trim()) ? (
                <div style={{ marginTop: "3px", fontSize: "11px", lineHeight: 1.35, color: "#5d6b84" }}>
                  Punto de regreso: <span style={{ color: "#1c2942", fontWeight: 600 }}>{f("returnPoint")}</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div style={sectionHeader}>
          {/* The editor's green "+" (add option) sits right after the title. */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h2 style={{ margin: 0, fontFamily: display, fontWeight: 700, fontSize: "19px" }}>Elige tu favorita</h2>
            {edit ? edit.addOption : null}
          </div>
          <span style={{ ...label, marginLeft: "auto" }}>
            COSTOS POR {party(true)} · {edit ? edit.currency : data.currency}
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
                <div style={{ marginTop: "2px", fontSize: "11px", color: "#5d6b84" }}>
                  Habitación {opt(index, "roomType")}
                  {edit || option.plan.trim() ? <> · {opt(index, "plan")}</> : null}
                </div>
              </div>
              <div style={{ flexShrink: 0, textAlign: "right" }}>
                <div style={{ fontSize: "19px", fontWeight: 800, whiteSpace: "nowrap" }}>
                  ${opt(index, "totalPrice")}
                </div>
                <div style={{ fontSize: "10px", color: "#5d6b84", whiteSpace: "nowrap" }}>
                  {passengers === "1" ? "por 1 pasajero" : <>por los {passengers || f("adults", true)} pasajeros</>}
                </div>
              </div>
              {edit ? edit.removeOption(index) : null}
            </div>
          ))}
        </div>

        <div style={sectionHeader}>
          {/* The editor's "+" (add item) sits right after the title. */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h2 style={{ margin: 0, fontFamily: display, fontWeight: 700, fontSize: "19px" }}>Incluye</h2>
            {edit ? edit.addInclude : null}
          </div>
          <span style={{ ...label, marginLeft: "auto" }}>CONSULTA CON TU EJECUTIVO PARA MÁS DETALLES</span>
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
                <span>
                  {edit ? edit.include(index, <IncludeText item={item} />) : <IncludeText item={item} />}
                </span>
              </div>
            </div>
          ))}
        </div>

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
          <span>
            Con <b>${f("depositPerPerson")} como mínimo por persona</b> podemos reservar, y estar dando el
            resto poco a poco, <b>semanal, quincenal o mensual</b>. Teniendo que estar{" "}
            <b>
              liquidado {f("liquidationDays", true)} {plural(data.liquidationDays, "día", "días")} antes del viaje
            </b>
            .
          </span>
        </div>

        <div style={{ flexGrow: 1, minHeight: "12px" }} />
        {/* The closing lines stay together when the PDF runs onto another page. */}
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
            <b>Recuerden: esto solo es una cotización.</b> Precios garantizados hasta obtener un pago en
            firme. Paquetes sujetos a disponibilidad.
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
              Gracias por tu confianza.
            </span>
            <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em", color: "#5d6b84" }}>
              AGENCIA ALVVAZ
            </span>
          </div>
          <div style={{ marginTop: "6px", fontSize: "10px", color: "#5d6b84" }}>
            Consulta las políticas generales con tu ejecutivo AlvVaz.
          </div>
        </div>
      </main>
    </div>
  );
}
