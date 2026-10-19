"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import { QuoteDocument, QUOTE_DOCUMENT_RESET_CSS, type QuoteDocumentEdit } from "@/components/quotes/QuoteDocument";
import { QUOTE_PREVIEW_FONTS } from "@/lib/quotes/fonts";
import {
  QUOTE_OPTION_LETTERS,
  QUOTE_OPTIONAL_FIELDS,
  type QuoteData,
  type QuoteIncludeItem,
  type QuoteOption,
  type QuoteOptionField,
  type QuoteTextField,
} from "@/lib/quotes/types";

import { FlightDateField, FlightTimeField, LiquidationDateField, TravelDatesField } from "./DateFields";
import { ChoiceField, IncludeField, InlineField, INLINE_FIELD_CSS, openSiblingField } from "./InlineField";
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
};

const OPTION_PLACEHOLDERS: Record<QuoteOptionField, { placeholder: string; label: string }> = {
  hotelName: { placeholder: "Nombre del hotel", label: "hotel" },
  totalPrice: { placeholder: "Precio", label: "precio total" },
};

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
        repeat(data.options[index][field], OPTION_PLACEHOLDERS[field].placeholder)
      ) : (
        <InlineField
          value={data.options[index][field]}
          onChange={(value) => updateOption(index, { [field]: value })}
          placeholder={OPTION_PLACEHOLDERS[field].placeholder}
          label={`Opción ${QUOTE_OPTION_LETTERS[index]}: ${OPTION_PLACEHOLDERS[field].label}`}
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
        className="mt-2 self-start rounded-full border border-dashed border-brand-300 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-700 hover:border-brand-500"
      >
        + Agregar nota
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

  return (
    <div ref={containerRef} className="w-full">
      <style>{QUOTE_DOCUMENT_RESET_CSS}</style>
      {onChange ? <style>{INLINE_FIELD_CSS}</style> : null}
      <div
        className="overflow-hidden rounded-xl shadow-[0_4px_24px_rgba(28,41,66,0.12)]"
        style={{ width: PAGE_WIDTH * scale, height: pageHeight * scale }}
      >
        <div ref={pageRef} style={{ width: PAGE_WIDTH, transform: `scale(${scale})`, transformOrigin: "top left" }}>
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
        </div>
      </div>
    </div>
  );
}
