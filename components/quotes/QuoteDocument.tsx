import type { CSSProperties, HTMLAttributes, ReactNode } from "react";

import type { QuoteFonts } from "@/lib/quotes/fonts";
import {
  QUOTE_OPTION_LETTERS,
  type QuoteData,
  type QuoteIncludeItem,
  type QuoteOptionField,
  type QuoteTextField,
} from "@/lib/quotes/types";

// Started as a 1:1 port of docs/cotizaciones/cotizacion-template.html; the main
// column now shows three hotel options instead of one hotel. Font families come
// from QuoteFonts so the preview and the PDF can load them differently.

// Slots the admin editor fills with inline inputs. The PDF never passes this,
// so every value renders as plain text there.
export type QuoteDocumentEdit = {
  // `repeat` marks a value already editable in another spot: shown as plain text there.
  field: (field: QuoteTextField, repeat?: boolean) => ReactNode;
  option: (index: number, field: QuoteOptionField, repeat?: boolean) => ReactNode;
  optionStars: (index: number) => ReactNode;
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
};

const optionCard: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "14px",
  padding: "8px 16px",
  border: "1px solid #d9e1ec",
  borderRadius: "12px",
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

// Option A, B, C badges: navy, blue, light blue.
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

export function QuoteDocument({ data, folio, logoSrc, fonts, className, edit }: QuoteDocumentProps) {
  const display = fonts.display;
  // Each value is an input only once; pass `repeat` for every other place it shows.
  const f = (field: QuoteTextField, repeat = false) => (edit ? edit.field(field, repeat) : data[field]);
  const opt = (index: number, field: QuoteOptionField, repeat = false) =>
    edit ? edit.option(index, field, repeat) : data.options[index][field];

  return (
    <div
      className={["quote-document", className].filter(Boolean).join(" ")}
      style={{
        width: "816px",
        height: "1056px",
        display: "flex",
        fontFamily: fonts.body,
        color: "#1c2942",
        background: "#ffffff",
        overflow: "hidden",
      }}
    >
      <aside
        style={{
          width: "236px",
          flexShrink: 0,
          boxSizing: "border-box",
          padding: "40px 28px 32px",
          background: "linear-gradient(180deg, #1d2a45 0%, #2b4d78 100%)",
          color: "#ffffff",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            width: "140px",
            height: "140px",
            borderRadius: "50%",
            background: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "18px",
            boxSizing: "border-box",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- must render identically in the server-side PDF */}
          <img
            src={logoSrc}
            alt="AlvVaz Agencia de Viajes"
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        </div>

        <div style={{ ...asideLabel, marginTop: "34px" }}>COTIZACIÓN</div>
        <div style={{ marginTop: "4px", fontSize: "30px", fontWeight: 800, letterSpacing: "0.02em" }}>
          #{folio}
        </div>

        <div style={{ ...asideLabel, marginTop: "16px" }}>FECHA DE COTIZACIÓN</div>
        <div style={{ marginTop: "4px", fontSize: "13.5px", fontWeight: 700 }}>{f("quoteDate")}</div>

        <div style={{ ...asideLabel, marginTop: "14px" }}>FECHAS DE VIAJE</div>
        <div style={{ marginTop: "4px", fontSize: "13.5px", fontWeight: 700 }}>{f("travelDates")}</div>

        <div style={{ marginTop: "20px", height: "1px", background: "rgba(255,255,255,0.18)" }} />

        <div style={{ ...asideLabel, marginTop: "20px" }}>RESUMEN · {f("adults", true)} ADULTOS (MXN)</div>
        <div style={{ marginTop: "4px" }}>
          {data.options.map((_, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "8px",
                fontSize: "12.5px",
                padding: "8px 0",
                borderBottom: "1px solid rgba(255,255,255,0.14)",
              }}
            >
              <span style={{ color: "#dbe3f0" }}>Opción {QUOTE_OPTION_LETTERS[index]}</span>
              <span style={{ fontWeight: 700 }}>${opt(index, "totalPrice", true)}.00</span>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: "18px",
            background: "#ffffff",
            borderRadius: "16px",
            padding: "18px 18px 16px",
            color: "#1c2942",
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
            <span style={{ fontSize: "28px", fontWeight: 800, whiteSpace: "nowrap" }}>
              ${f("depositTotal")}
            </span>
            <span style={{ fontSize: "10px", fontWeight: 700, color: "#5d6b84" }}>MXN</span>
          </div>
          <div style={{ marginTop: "4px", fontSize: "11px", color: "#5d6b84" }}>
            ${f("depositPerPerson")} mínimo por persona
          </div>
        </div>

        <div style={{ marginTop: "16px", display: "flex", gap: "12px", alignItems: "flex-start" }}>
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
              21 días antes de la salida. Abona semanal, quincenal o mensual.
            </div>
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
        style={{
          flexGrow: 1,
          boxSizing: "border-box",
          padding: "40px 40px 28px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.2em", color: "#2f6db5" }}>
          COTIZACIÓN DE VIAJE · {data.options.length} OPCIONES
        </div>
        <h1
          style={{
            margin: "6px 0 0",
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
          {f("nights")} noches con salida desde {f("originCode")} · elige el hotel que más te guste
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
              <path d="M2 16l20-6-2-3-7 2-6-5-2 1 4 6-5 1.5-2-2-1.5.5z" />
              <path d="M3 20h18" />
            </svg>
            <div>
              <div style={flightLabel}>
                SALIDA · {f("originCode", true)} → {f("destinationCode")}
              </div>
              <div style={{ marginTop: "2px", fontSize: "14px", fontWeight: 700 }}>
                {f("departureDate")} · {f("departureTime")}
              </div>
            </div>
          </div>
          <div style={flightCard}>
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
              <path d="M22 16L2 10l2-3 7 2 6-5 2 1-4 6 5 1.5 2-2 1.5.5z" />
              <path d="M3 20h18" />
            </svg>
            <div>
              <div style={flightLabel}>
                REGRESO · {f("destinationCode", true)} → {f("originCode", true)}
              </div>
              <div style={{ marginTop: "2px", fontSize: "14px", fontWeight: 700 }}>
                {f("returnDate")} · {f("returnTime")}
              </div>
            </div>
          </div>
        </div>

        <div style={sectionHeader}>
          <h2 style={{ margin: 0, fontFamily: display, fontWeight: 700, fontSize: "19px" }}>Opciones de hotel</h2>
          <span style={label}>COSTOS POR {f("adults")} ADULTOS · MXN</span>
        </div>
        <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "6px" }}>
          {data.options.map((option, index) => (
            <div key={index} style={optionCard}>
              <span style={{ ...optionBadge, fontFamily: display, background: OPTION_COLORS[index] }}>
                {QUOTE_OPTION_LETTERS[index]}
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
                  Habitación {f("roomType", index > 0)} · Plan Todo Incluido
                </div>
              </div>
              <div style={{ flexShrink: 0, textAlign: "right" }}>
                <div style={{ fontSize: "19px", fontWeight: 800, whiteSpace: "nowrap" }}>
                  ${opt(index, "totalPrice")}
                </div>
                <div style={{ fontSize: "10px", color: "#5d6b84", whiteSpace: "nowrap" }}>
                  por los {f("adults", true)} pasajeros
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={sectionHeader}>
          <h2 style={{ margin: 0, fontFamily: display, fontWeight: 700, fontSize: "19px" }}>Incluye</h2>
          <span style={label}>EN TODAS LAS OPCIONES</span>
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
              style={{ padding: "8px 0", borderBottom: "1px solid #e3e9f1" }}
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
        {edit ? edit.addInclude : null}

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
          }}
        >
          <span style={{ fontFamily: display, fontSize: "16px", color: "#3f8ec9", width: "12px" }}>1</span>
          <span>
            Con <b>${f("depositPerPerson", true)} como mínimo por persona</b> podemos reservar, y estar dando el
            resto poco a poco, <b>semanal, quincenal o mensual</b>. Teniendo que estar{" "}
            <b>liquidado 21 días antes del viaje</b>.
          </span>
        </div>

        <div style={{ flexGrow: 1, minHeight: "12px" }} />
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
            marginTop: "10px",
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
      </main>
    </div>
  );
}
