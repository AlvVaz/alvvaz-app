"use client";

import { useEffect, useRef, useState } from "react";

import { QuoteDocument, QUOTE_DOCUMENT_RESET_CSS, type QuoteDocumentEdit } from "@/components/quotes/QuoteDocument";
import { QUOTE_PREVIEW_FONTS } from "@/lib/quotes/fonts";
import type { QuoteData, QuoteIncludeItem, QuoteTextField } from "@/lib/quotes/types";

import { FlightDateField, FlightTimeField, LiquidationDateField, TravelDatesField } from "./DateFields";
import { InlineField, INLINE_FIELD_CSS } from "./InlineField";
import { StarRating } from "./StarRating";

const PAGE_WIDTH = 816;
const PAGE_HEIGHT = 1056;

type QuotePreviewProps = {
  data: QuoteData;
  folio: string;
  // When set, every value on the document becomes an inline field.
  onChange?: (data: QuoteData) => void;
  // Shown as a filled box that can't be typed in (set by the server).
  lockedFields?: QuoteTextField[];
  // Auto-filled and shown as plain text, with no box.
  plainFields?: QuoteTextField[];
};

// Example values shown inside empty fields. Money is typed without "$".
const FIELD_PLACEHOLDERS: Record<QuoteTextField, { placeholder: string; label: string }> = {
  clientName: { placeholder: "Juan Pérez", label: "Cliente" },
  vendorName: { placeholder: "Ana López", label: "Vendedor" },
  quoteDate: { placeholder: "13 de octubre 2026", label: "Fecha de cotización" },
  travelDates: { placeholder: "7 al 10 de enero 2027", label: "Fechas de viaje" },
  hotelName: { placeholder: "Hotel Flamingo Cancún", label: "Hotel" },
  location: { placeholder: "Cancún, Q.R", label: "Destino / ubicación" },
  roomType: { placeholder: "Estándar", label: "Habitación" },
  nights: { placeholder: "3", label: "Noches" },
  originCode: { placeholder: "SLP", label: "Origen (código)" },
  originCity: { placeholder: "San Luis Potosí", label: "Ciudad de origen" },
  destinationCode: { placeholder: "Cancún", label: "Destino (vuelos)" },
  seats: { placeholder: "2", label: "Asientos de avión" },
  departureDate: { placeholder: "7 ene", label: "Fecha de salida" },
  departureTime: { placeholder: "7:09 AM", label: "Hora de salida" },
  returnDate: { placeholder: "10 ene", label: "Fecha de regreso" },
  returnTime: { placeholder: "11:00 AM", label: "Hora de regreso" },
  adults: { placeholder: "2", label: "Adultos" },
  totalPrice: { placeholder: "24,908", label: "Precio total" },
  depositTotal: { placeholder: "3,000", label: "Reserva con" },
  depositPerPerson: { placeholder: "1,500", label: "Mínimo por persona" },
  liquidationDay: { placeholder: "17", label: "Liquidación: día" },
  liquidationMonth: { placeholder: "DIC", label: "Liquidación: mes" },
  liquidationYear: { placeholder: "2026", label: "Liquidación: año" },
};

const INCLUDE_PLACEHOLDERS: Record<keyof QuoteIncludeItem, string> = {
  title: "título",
  detail: "detalle",
  note: "nota",
};

const controlButton =
  "flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white text-[10px] leading-none text-slate-600 shadow-sm hover:border-brand-400 hover:text-brand-700 disabled:opacity-30";

function buildEdit(
  data: QuoteData,
  onChange: (data: QuoteData) => void,
  lockedFields: QuoteTextField[],
  plainFields: QuoteTextField[]
): QuoteDocumentEdit {
  const updateInclude = (index: number, part: keyof QuoteIncludeItem, value: string) =>
    onChange({
      ...data,
      includes: data.includes.map((item, i) => (i === index ? { ...item, [part]: value } : item)),
    });

  const moveInclude = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= data.includes.length) return;
    const includes = [...data.includes];
    [includes[index], includes[target]] = [includes[target], includes[index]];
    onChange({ ...data, includes });
  };

  return {
    field: (field) =>
      field === "travelDates" ? (
        <TravelDatesField data={data} onChange={onChange} {...FIELD_PLACEHOLDERS[field]} />
      ) : field === "departureDate" || field === "returnDate" ? (
        <FlightDateField data={data} onChange={onChange} part={field} {...FIELD_PLACEHOLDERS[field]} />
      ) : field === "departureTime" || field === "returnTime" ? (
        <FlightTimeField data={data} onChange={onChange} part={field} {...FIELD_PLACEHOLDERS[field]} />
      ) : field === "liquidationDay" || field === "liquidationMonth" || field === "liquidationYear" ? (
        <LiquidationDateField data={data} onChange={onChange} part={field} {...FIELD_PLACEHOLDERS[field]} />
      ) : plainFields.includes(field) ? (
        data[field]
      ) : lockedFields.includes(field) ? (
        <span
          className="quote-field"
          data-state="locked"
          aria-readonly="true"
          title="Se asigna automáticamente"
        >
          {data[field]}
        </span>
      ) : (
        <InlineField
          value={data[field]}
          onChange={(value) => onChange({ ...data, [field]: value })}
          placeholder={FIELD_PLACEHOLDERS[field].placeholder}
          label={FIELD_PLACEHOLDERS[field].label}
        />
      ),
    stars: (
      <span
        className="quote-stars"
        data-state={data.stars ? "filled" : "missing"}
        style={{ display: "inline-flex" }}
      >
        <StarRating
          value={data.stars}
          onChange={(stars) => onChange({ ...data, stars })}
          size={13}
          showLabel={false}
        />
      </span>
    ),
    includePart: (index, part) => (
      <InlineField
        value={data.includes[index]?.[part] ?? ""}
        onChange={(value) => updateInclude(index, part, value)}
        placeholder={INCLUDE_PLACEHOLDERS[part]}
        label={`Incluye ${index + 1}: ${INCLUDE_PLACEHOLDERS[part]}`}
        optional
      />
    ),
    includeControls: (index) => (
      <span className="quote-include-controls">
        <button
          type="button"
          onClick={() => moveInclude(index, -1)}
          disabled={index === 0}
          aria-label="Subir item"
          className={controlButton}
        >
          ↑
        </button>
        <button
          type="button"
          onClick={() => moveInclude(index, 1)}
          disabled={index === data.includes.length - 1}
          aria-label="Bajar item"
          className={controlButton}
        >
          ↓
        </button>
        <button
          type="button"
          onClick={() => onChange({ ...data, includes: data.includes.filter((_, i) => i !== index) })}
          aria-label="Quitar item"
          className={`${controlButton} hover:border-rose-400 hover:text-rose-600`}
        >
          ✕
        </button>
      </span>
    ),
    addInclude: (
      <button
        type="button"
        onClick={() => onChange({ ...data, includes: [...data.includes, {}] })}
        className="mt-2 self-start rounded-full border border-dashed border-brand-300 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-700 hover:border-brand-500"
      >
        + Agregar item
      </button>
    ),
  };
}

// Renders the quote at its real 816x1056 size and scales it down to fit.
export function QuotePreview({
  data,
  folio,
  onChange,
  lockedFields = [],
  plainFields = [],
}: QuotePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(([entry]) => {
      setScale(Math.min(1, entry.contentRect.width / PAGE_WIDTH));
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="w-full">
      <style>{QUOTE_DOCUMENT_RESET_CSS}</style>
      {onChange ? <style>{INLINE_FIELD_CSS}</style> : null}
      <div
        className="overflow-hidden rounded-xl shadow-[0_4px_24px_rgba(28,41,66,0.12)]"
        style={{ width: PAGE_WIDTH * scale, height: PAGE_HEIGHT * scale }}
      >
        <div style={{ width: PAGE_WIDTH, transform: `scale(${scale})`, transformOrigin: "top left" }}>
          <QuoteDocument
            data={data}
            folio={folio}
            logoSrc="/logoalvvaz.png"
            fonts={QUOTE_PREVIEW_FONTS}
            edit={onChange ? buildEdit(data, onChange, lockedFields, plainFields) : undefined}
          />
        </div>
      </div>
    </div>
  );
}
