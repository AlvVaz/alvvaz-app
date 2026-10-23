"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Plus, X } from "lucide-react";

import { QuoteDocument, QUOTE_DOCUMENT_RESET_CSS, type QuoteDocumentEdit } from "@/components/quotes/QuoteDocument";
import { QUOTE_PREVIEW_FONTS } from "@/lib/quotes/fonts";
import {
  QUOTE_CURRENCIES,
  QUOTE_MAX_OPTIONS,
  QUOTE_OPTIONAL_FIELDS,
  createEmptyQuoteOption,
  quoteOptionLetter,
  type QuoteData,
  type QuoteIncludeItem,
  type QuoteOption,
  type QuoteOptionField,
  type QuoteTextField,
} from "@/lib/quotes/types";

import { FlightDateField, FlightTimeField, LiquidationDateField, TravelDatesField } from "./DateFields";
import {
  ChoiceField,
  IncludeField,
  InlineField,
  INLINE_FIELD_CSS,
  MinorAgesField,
  MinorsField,
  openSiblingField,
} from "./InlineField";
import { StarRating } from "./StarRating";

const PAGE_WIDTH = 816;
const MAX_SCALE = 1.5;
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
  // Owner/tech only: admins that can be picked as Vendedor (otherwise it's locked).
  vendorOptions?: string[];
};

// Generic names shown inside empty fields; "#" where the template already says
// the unit ("# noches"). Money is typed without "$".
const FIELD_PLACEHOLDERS: Record<QuoteTextField, { placeholder: string; label: string }> = {
  clientName: { placeholder: "Nombre del cliente", label: "Cliente" },
  clientPhone: { placeholder: "Teléfono del cliente", label: "Teléfono del cliente" },
  vendorName: { placeholder: "Vendedor", label: "Vendedor" },
  quoteDate: { placeholder: "Fecha", label: "Fecha de cotización" },
  travelDates: { placeholder: "Fechas de viaje", label: "Fechas de viaje" },
  title: { placeholder: "Título del viaje", label: "Título" },
  roomType: { placeholder: "Tipo de habitación", label: "Habitación" },
  nights: { placeholder: "#", label: "Noches" },
  originCode: { placeholder: "Origen", label: "Origen (código)" },
  destinationCode: { placeholder: "Destino", label: "Destino" },
  departureDate: { placeholder: "Fecha", label: "Fecha de salida" },
  departureTime: { placeholder: "Hora", label: "Hora de salida" },
  meetingPoint: { placeholder: "Lugar de reunión", label: "Punto de salida" },
  returnDate: { placeholder: "Fecha", label: "Fecha de regreso" },
  returnTime: { placeholder: "Hora", label: "Hora de regreso" },
  adults: { placeholder: "#", label: "Adultos" },
  minors: { placeholder: "#", label: "Menores" },
  depositTotal: { placeholder: "Monto", label: "Reserva con" },
  depositPerPerson: { placeholder: "Monto", label: "Mínimo por persona" },
  liquidationDay: { placeholder: "Día", label: "Liquidación: día" },
  liquidationMonth: { placeholder: "Mes", label: "Liquidación: mes" },
  liquidationYear: { placeholder: "Año", label: "Liquidación: año" },
  liquidationDays: { placeholder: "#", label: "Días antes de la salida" },
};

const OPTION_PLACEHOLDERS: Record<QuoteOptionField, { placeholder: string; label: string }> = {
  hotelName: { placeholder: "Nombre del hotel", label: "hotel" },
  totalPrice: { placeholder: "Precio", label: "precio total" },
  plan: { placeholder: "Plan", label: "plan" },
};

// Internacional options are whole trips, so their name field asks for the trip instead of the hotel.
function optionPlaceholder(kind: QuoteData["kind"], field: QuoteOptionField) {
  return kind === "internacional" && field === "hotelName"
    ? { placeholder: "Nombre del viaje", label: "viaje" }
    : OPTION_PLACEHOLDERS[field];
}

// Editor-only grey hints on the auto-filled "Incluye" items while their source
// fields are still empty, so it's clear they fill themselves. Never on the PDF.
function withAutoHint(item: QuoteIncludeItem, data: QuoteData, content: ReactNode) {
  if (item.auto === "route" && !item.detail) {
    return (
      <>
        {content} <span className="quote-include-hint">Origen / Destino / Origen</span>
      </>
    );
  }
  if (item.auto === "stay") {
    const nightsHint = !item.title ? <b className="quote-include-hint"># noches </b> : null;
    const roomHint =
      !data.roomType.trim() && item.detail === "de hospedaje" ? (
        <span className="quote-include-hint"> en habitación Tipo de habitación</span>
      ) : null;
    if (nightsHint || roomHint) {
      return (
        <>
          {nightsHint}
          {content}
          {roomHint}
        </>
      );
    }
  }
  return content;
}

// The "Incluye" item being dragged, and the one it's over.
type IncludeDrag = { from: number; over: number | null } | null;

function buildEdit(
  data: QuoteData,
  onChange: (data: QuoteData) => void,
  lockedFields: QuoteTextField[],
  plainFields: QuoteTextField[],
  vendorOptions: string[] | undefined,
  drag: IncludeDrag,
  setDrag: (drag: IncludeDrag) => void
): QuoteDocumentEdit {
  const updateInclude = (index: number, next: QuoteIncludeItem) =>
    onChange({
      ...data,
      includes: data.includes.map((item, i) => (i === index ? next : item)),
    });

  const updateOption = (index: number, changes: Partial<QuoteOption>) =>
    onChange({
      ...data,
      options: data.options.map((option, i) => (i === index ? { ...option, ...changes } : option)),
    });

  // The moved item takes the target's place; the rest shift over.
  const moveInclude = (from: number, to: number) => {
    if (from === to || to < 0 || to >= data.includes.length) return;
    const includes = [...data.includes];
    const [item] = includes.splice(from, 1);
    includes.splice(to, 0, item);
    onChange({ ...data, includes });
  };

  const repeat = (value: string, placeholder: string) => (
    <span className="quote-repeat" data-placeholder={placeholder}>
      {value}
    </span>
  );

  return {
    field: (field, isRepeat) =>
      isRepeat ? (
        repeat(data[field], FIELD_PLACEHOLDERS[field].placeholder)
      ) : field === "travelDates" ? (
        <TravelDatesField data={data} onChange={onChange} {...FIELD_PLACEHOLDERS[field]} />
      ) : field === "departureDate" || field === "returnDate" ? (
        <FlightDateField data={data} onChange={onChange} part={field} {...FIELD_PLACEHOLDERS[field]} />
      ) : field === "departureTime" || field === "returnTime" ? (
        <FlightTimeField data={data} onChange={onChange} part={field} {...FIELD_PLACEHOLDERS[field]} />
      ) : field === "liquidationDay" || field === "liquidationMonth" || field === "liquidationYear" ? (
        <LiquidationDateField data={data} onChange={onChange} part={field} {...FIELD_PLACEHOLDERS[field]} />
      ) : field === "minors" ? (
        <MinorsField data={data} onChange={onChange} {...FIELD_PLACEHOLDERS[field]} />
      ) : field === "vendorName" && vendorOptions?.length ? (
        <ChoiceField
          value={data[field]}
          options={vendorOptions}
          onChange={(value) => onChange({ ...data, [field]: value })}
          {...FIELD_PLACEHOLDERS[field]}
        />
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
          optional={QUOTE_OPTIONAL_FIELDS.includes(field)}
        />
      ),
    option: (index, field, isRepeat) =>
      isRepeat ? (
        repeat(data.options[index][field], optionPlaceholder(data.kind, field).placeholder)
      ) : (
        <InlineField
          value={data.options[index][field]}
          onChange={(value) => updateOption(index, { [field]: value })}
          placeholder={optionPlaceholder(data.kind, field).placeholder}
          label={`Opción ${quoteOptionLetter(index)}: ${optionPlaceholder(data.kind, field).label}`}
          // The plan is pre-filled and can be left empty; it isn't counted in "Faltan".
          optional={field === "plan"}
        />
      ),
    optionStars: (index) => (
      <span
        className="quote-stars"
        data-state={data.options[index].stars ? "filled" : "missing"}
        style={{ display: "inline-flex" }}
        // Tab leaves the stars for the next field instead of walking through all five.
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          if (openSiblingField(event.currentTarget, event.shiftKey ? -1 : 1)) event.preventDefault();
        }}
      >
        <StarRating
          value={data.options[index].stars}
          onChange={(stars) => updateOption(index, { stars })}
          size={13}
          showLabel={false}
        />
      </span>
    ),
    // Any option can be removed while there's more than one; the letters after it move up.
    removeOption: (index) =>
      data.options.length > 1 ? (
        <button
          type="button"
          onClick={() => onChange({ ...data, options: data.options.filter((_, i) => i !== index) })}
          aria-label={`Quitar opción ${quoteOptionLetter(index)}`}
          title={`Quitar opción ${quoteOptionLetter(index)}`}
          className="-mr-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      ) : null,
    addOption:
      data.options.length < QUOTE_MAX_OPTIONS ? (
        <button
          type="button"
          onClick={() => onChange({ ...data, options: [...data.options, createEmptyQuoteOption()] })}
          aria-label={`Agregar opción ${quoteOptionLetter(data.options.length)}`}
          title={`Agregar opción ${quoteOptionLetter(data.options.length)}`}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm transition-colors hover:bg-emerald-700"
        >
          <Plus aria-hidden="true" strokeWidth={2.25} className="h-3.5 w-3.5" />
        </button>
      ) : null,
    minorAges: <MinorAgesField data={data} onChange={onChange} />,
    currency: (
      <ChoiceField
        value={data.currency}
        options={QUOTE_CURRENCIES}
        onChange={(value) => onChange({ ...data, currency: value === "USD" ? "USD" : "MXN" })}
        placeholder="Moneda"
        label="Moneda"
        showArrow
      />
    ),
    include: (index, content) => (
      <IncludeField
        item={data.includes[index]}
        onChange={(item) => updateInclude(index, item)}
        onRemove={() => onChange({ ...data, includes: data.includes.filter((_, i) => i !== index) })}
        label={`Incluye ${index + 1}`}
      >
        {withAutoHint(data.includes[index], data, content)}
      </IncludeField>
    ),
    includeProps: (index) => ({
      className: [
        "quote-include",
        drag?.from === index ? "is-dragging" : "",
        drag && drag.over === index && drag.from !== index ? "is-drop-target" : "",
      ]
        .filter(Boolean)
        .join(" "),
      draggable: true,
      title: "Arrastra para mover · Alt+↑/↓",
      onDragStart: (event) => {
        event.dataTransfer.effectAllowed = "move";
        // Firefox only starts a drag when some data is set.
        event.dataTransfer.setData("text/plain", "");
        setDrag({ from: index, over: null });
      },
      onDragOver: (event) => {
        if (!drag) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        if (drag.over !== index) setDrag({ ...drag, over: index });
      },
      onDrop: (event) => {
        event.preventDefault();
        if (drag) moveInclude(drag.from, index);
        setDrag(null);
      },
      onDragEnd: () => setDrag(null),
      // Keyboard alternative to dragging; focus follows the moved item.
      onKeyDown: (event) => {
        if (!event.altKey || (event.key !== "ArrowUp" && event.key !== "ArrowDown")) return;
        const target = index + (event.key === "ArrowUp" ? -1 : 1);
        if (target < 0 || target >= data.includes.length) return;
        event.preventDefault();
        const list = event.currentTarget.parentElement;
        moveInclude(index, target);
        requestAnimationFrame(() => list?.children[target]?.querySelector<HTMLElement>(".quote-field")?.focus());
      },
    }),
    addInclude: (
      <button
        type="button"
        onClick={() => onChange({ ...data, includes: [...data.includes, {}] })}
        aria-label="Agregar nota"
        title="Agregar nota"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-dashed border-brand-400 text-brand-700 transition-colors hover:border-brand-500 hover:bg-brand-200/40"
      >
        <Plus aria-hidden="true" strokeWidth={2.25} className="h-3.5 w-3.5" />
      </button>
    ),
  };
}

// Renders the quote at its real 816x1056 size and scales it to the available
// width, up to MAX_SCALE so it's easier to read and fill in.
export function QuotePreview({
  data,
  folio,
  onChange,
  lockedFields = [],
  plainFields = [],
  vendorOptions,
}: QuotePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  // Taller than the real page while editing; see QuoteDocument.
  const [pageHeight, setPageHeight] = useState(PAGE_HEIGHT);
  const [drag, setDrag] = useState<IncludeDrag>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(([entry]) => {
      setScale(Math.min(MAX_SCALE, entry.contentRect.width / PAGE_WIDTH));
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;
    const observer = new ResizeObserver(([entry]) => setPageHeight(entry.contentRect.height));
    observer.observe(page);
    return () => observer.disconnect();
  }, []);

  // Where the PDF moves to the next page. Approximate: the PDF never splits a card or
  // an "Incluye" row, and the editor shows a few things the PDF doesn't.
  const pageBreaks = Array.from(
    { length: Math.floor((pageHeight - 1) / PAGE_HEIGHT) },
    (_, index) => (index + 1) * PAGE_HEIGHT
  );

  return (
    <div ref={containerRef} className="w-full">
      <style>{QUOTE_DOCUMENT_RESET_CSS}</style>
      {onChange ? <style>{INLINE_FIELD_CSS}</style> : null}
      <div
        className="overflow-hidden rounded-xl shadow-[0_4px_24px_rgba(28,41,66,0.12)]"
        style={{ width: PAGE_WIDTH * scale, height: pageHeight * scale }}
      >
        <div
          ref={pageRef}
          style={{ position: "relative", width: PAGE_WIDTH, transform: `scale(${scale})`, transformOrigin: "top left" }}
        >
          <QuoteDocument
            data={data}
            folio={folio}
            logoSrc="/logoalvvaz.png"
            fonts={QUOTE_PREVIEW_FONTS}
            edit={
              onChange
                ? buildEdit(data, onChange, lockedFields, plainFields, vendorOptions, drag, setDrag)
                : undefined
            }
          />
          {pageBreaks.map((top, index) => (
            <div
              key={top}
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 border-t-2 border-dashed border-brand-400"
              style={{ top }}
            >
              <span className="absolute right-3 top-1.5 rounded-full bg-brand-400 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white">
                Página {index + 2}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
