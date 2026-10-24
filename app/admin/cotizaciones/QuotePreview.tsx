"use client";

import { useEffect, useRef, useState } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import { Check, ChevronDown, ChevronUp, Dot, EyeOff, Minus, Plus, Trash2, X } from "lucide-react";

import {
  QuoteDocument,
  QUOTE_DOCUMENT_RESET_CSS,
  RichText,
  type QuoteDocumentEdit,
} from "@/components/quotes/QuoteDocument";
import { QUOTE_PREVIEW_FONTS } from "@/lib/quotes/fonts";
import {
  addCustomSection,
  emptyRates,
  moveSection,
  openText,
  QUOTE_MAX_CATEGORIES,
  QUOTE_MAX_CUSTOM_SECTIONS,
  QUOTE_ROW_MARKERS,
  QUOTE_TEXT_DEFAULTS,
  QUOTE_TEXT_LABELS,
  QUOTE_TRANSPORT_LABELS,
  removeCustomSection,
  setOpenText,
  setSectionHidden,
  updateCustomSection,
  visibleSections,
  type QuoteOpenSettings,
  type QuoteRowMarker,
  type QuoteSectionId,
  type QuoteTransport,
} from "@/lib/quotes/open";
import {
  QUOTE_CURRENCIES,
  QUOTE_MAX_OPTIONS,
  createEmptyQuoteOption,
  isQuoteFieldOptional,
  quoteOptionLetter,
  type QuoteData,
  type QuoteIncludeItem,
  type QuoteOption,
  type QuoteOptionField,
  type QuoteRate,
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

// "fit": as wide as the editor (up to MAX_SCALE); a number: that scale (1 = real size).
// Editor only, the PDF is always real size.
export type QuoteZoom = "fit" | number;

type QuotePreviewProps = {
  data: QuoteData;
  folio: string;
  zoom?: QuoteZoom;
  // Reports the scale actually used, for the zoom control's percentage.
  onScaleChange?: (scale: number) => void;
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
  nights: { placeholder: "#", label: "Noches" },
  originCode: { placeholder: "Origen", label: "Origen (código)" },
  destinationCode: { placeholder: "Destino", label: "Destino" },
  departureDate: { placeholder: "Fecha", label: "Fecha de salida" },
  departureTime: { placeholder: "Hora", label: "Hora de salida" },
  meetingPoint: { placeholder: "Lugar de reunión", label: "Punto de salida" },
  returnPoint: { placeholder: "Lugar de llegada", label: "Punto de regreso" },
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
  roomType: { placeholder: "Tipo de habitación", label: "habitación" },
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
    // Only while no option has a room yet; with different rooms the line leaves it out on purpose.
    // Abierta has no room field, so no room hint there.
    const roomHint =
      !data.open && data.options.every((option) => !option.roomType.trim()) && item.detail === "de hospedaje" ? (
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

// The row being dragged and the one it's over, in one list: "includes", "payment"
// (Abierta's Métodos de pago) or a custom section's id. Rows only move within their list.
type RowDrag = { list: string; from: number; over: number | null } | null;

// The moved item takes the target's place; the rest shift over.
function moveItem<T>(items: T[], from: number, to: number) {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

const MARKER_LABELS: Record<QuoteRowMarker, string> = { check: "Palomita", dot: "Punto", none: "Sin viñeta" };
const MARKER_ICONS: Record<QuoteRowMarker, ReactNode> = {
  check: <Check aria-hidden="true" strokeWidth={2.5} className="h-3 w-3" />,
  dot: <Dot aria-hidden="true" strokeWidth={6} className="h-3 w-3" />,
  none: <Minus aria-hidden="true" strokeWidth={2.5} className="h-3 w-3" />,
};

type SectionToolProps = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: ReactNode;
};

// Small round button next to an Abierta section (move, hide, remove).
function SectionTool({ label, onClick, disabled = false, danger = false, children }: SectionToolProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`flex h-5 w-5 items-center justify-center rounded-full border bg-white shadow-sm transition disabled:cursor-default disabled:opacity-40 ${
        danger ? "border-rose-200 text-rose-600 hover:bg-rose-50" : "border-slate-200 text-brand-700 hover:bg-brand-200/40"
      }`}
    >
      {children}
    </button>
  );
}

const transportFromLabel = (value: string) =>
  (Object.keys(QUOTE_TRANSPORT_LABELS) as QuoteTransport[]).find((key) => QUOTE_TRANSPORT_LABELS[key] === value) ??
  "plane";

function buildEdit(
  data: QuoteData,
  onChange: (data: QuoteData) => void,
  lockedFields: QuoteTextField[],
  plainFields: QuoteTextField[],
  vendorOptions: string[] | undefined,
  drag: RowDrag,
  setDrag: (drag: RowDrag) => void
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

  const moveInclude = (from: number, to: number) => {
    if (from === to || to < 0 || to >= data.includes.length) return;
    onChange({ ...data, includes: moveItem(data.includes, from, to) });
  };

  // Drag and drop (and Alt+↑/↓) for one row of a list; `move` reorders that list.
  const dragProps = (
    list: string,
    index: number,
    length: number,
    move: (from: number, to: number) => void
  ): HTMLAttributes<HTMLDivElement> => ({
    className: [
      "quote-include",
      drag?.list === list && drag.from === index ? "is-dragging" : "",
      drag?.list === list && drag.over === index && drag.from !== index ? "is-drop-target" : "",
    ]
      .filter(Boolean)
      .join(" "),
    draggable: true,
    title: "Arrastra para mover · Alt+↑/↓",
    onDragStart: (event) => {
      event.dataTransfer.effectAllowed = "move";
      // Firefox only starts a drag when some data is set.
      event.dataTransfer.setData("text/plain", "");
      setDrag({ list, from: index, over: null });
    },
    onDragOver: (event) => {
      if (drag?.list !== list) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      if (drag.over !== index) setDrag({ ...drag, over: index });
    },
    onDrop: (event) => {
      event.preventDefault();
      if (drag?.list === list) move(drag.from, index);
      setDrag(null);
    },
    onDragEnd: () => setDrag(null),
    // Keyboard alternative to dragging; focus follows the moved item.
    onKeyDown: (event) => {
      if (!event.altKey || (event.key !== "ArrowUp" && event.key !== "ArrowDown")) return;
      const target = index + (event.key === "ArrowUp" ? -1 : 1);
      if (target < 0 || target >= length) return;
      event.preventDefault();
      const rows = event.currentTarget.parentElement;
      move(index, target);
      requestAnimationFrame(() => rows?.children[target]?.querySelector<HTMLElement>(".quote-field")?.focus());
    },
  });

  // Abierta only (data.open): the settings the other types fix in the template.
  const open = data.open;
  const setOpen = (next: QuoteOpenSettings) => onChange({ ...data, open: next });
  const rowsOf = (list: string) =>
    (list === "payment" ? open?.payment : open?.sections.find((section) => section.id === list)?.items) ?? [];
  const setRows = (list: string, items: QuoteIncludeItem[]) => {
    if (!open) return;
    setOpen(list === "payment" ? { ...open, payment: items } : updateCustomSection(open, list, { items }));
  };
  const rowLabel = (list: string) =>
    list === "payment"
      ? "Método de pago"
      : open?.sections.find((section) => section.id === list)?.heading.replace(/\*\*/g, "") || "Fila";
  // Abierta: one option's own price categories.
  const setRates = (optionIndex: number, rates: QuoteRate[]) => updateOption(optionIndex, { rates });
  const rateAt = (optionIndex: number, index: number) => data.options[optionIndex].rates?.[index];

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
          optional={isQuoteFieldOptional(data.kind, field)}
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
          // Starts with the room (Abierta: the note and the category names, without prices) of
          // the option above it, since most quotes repeat them.
          onClick={() => {
            const above = data.options[data.options.length - 1];
            onChange({
              ...data,
              options: [
                ...data.options,
                {
                  ...createEmptyQuoteOption(open),
                  roomType: above?.roomType ?? "",
                  ...(open
                    ? {
                        note: above?.note ?? "",
                        rates: above?.rates ? emptyRates(above.rates.map((rate) => rate.label)) : emptyRates(),
                      }
                    : null),
                },
              ],
            });
          }}
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
    includeProps: (index) => dragProps("includes", index, data.includes.length, moveInclude),
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
    text: (key) =>
      open ? (
        <InlineField
          variant="text"
          value={openText(open, key)}
          defaultValue={QUOTE_TEXT_DEFAULTS[key]}
          display={<RichText text={openText(open, key)} />}
          onChange={(value) => setOpen(setOpenText(open, key, value))}
          placeholder="Texto oculto"
          label={QUOTE_TEXT_LABELS[key]}
        />
      ) : null,
    optionNote: (index) => (
      <InlineField
        value={data.options[index].note ?? ""}
        onChange={(value) => updateOption(index, { note: value })}
        placeholder="Costo por persona"
        label={`Opción ${quoteOptionLetter(index)}: nota`}
        optional
      />
    ),
    // Each hotel's categories are its own: renaming or removing one only changes that hotel.
    rateLabel: (optionIndex, index) => {
      const rates = data.options[optionIndex].rates ?? [];
      return (
        <InlineField
          value={rateAt(optionIndex, index)?.label ?? ""}
          onChange={(value) =>
            setRates(optionIndex, rates.map((rate, i) => (i === index ? { ...rate, label: value } : rate)))
          }
          placeholder="Categoría"
          label={`Opción ${quoteOptionLetter(optionIndex)}: categoría ${index + 1}`}
          onRemove={() => setRates(optionIndex, rates.filter((_, i) => i !== index))}
          removeLabel="Quitar categoría"
          // Order matters: the sidebar summary shows the first category with a price.
          actions={[
            {
              label: "← Mover",
              title: "Mover a la izquierda",
              disabled: index === 0,
              onClick: () => setRates(optionIndex, moveItem(rates, index, index - 1)),
            },
            {
              label: "Mover →",
              title: "Mover a la derecha",
              disabled: index === rates.length - 1,
              onClick: () => setRates(optionIndex, moveItem(rates, index, index + 1)),
            },
          ]}
        />
      );
    },
    // Blank = not printed on the PDF.
    ratePrice: (optionIndex, index) => {
      const rates = data.options[optionIndex].rates ?? [];
      return (
        <InlineField
          value={rateAt(optionIndex, index)?.price ?? ""}
          onChange={(value) =>
            setRates(optionIndex, rates.map((rate, i) => (i === index ? { ...rate, price: value } : rate)))
          }
          placeholder="Precio"
          label={`Opción ${quoteOptionLetter(optionIndex)}: ${rateAt(optionIndex, index)?.label || "precio"}`}
          optional
        />
      );
    },
    addRate: (optionIndex) => {
      const rates = data.options[optionIndex].rates ?? [];
      return rates.length < QUOTE_MAX_CATEGORIES ? (
        <button
          type="button"
          onClick={() => setRates(optionIndex, [...rates, { label: "", price: "" }])}
          aria-label={`Agregar categoría a la opción ${quoteOptionLetter(optionIndex)}`}
          title="Agregar categoría"
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-dashed border-brand-400 text-brand-700 transition-colors hover:border-brand-500 hover:bg-brand-200/40"
        >
          <Plus aria-hidden="true" strokeWidth={2.25} className="h-3 w-3" />
        </button>
      ) : null;
    },
    transport: (icon) =>
      open ? (
        <ChoiceField
          value={QUOTE_TRANSPORT_LABELS[open.transport]}
          options={Object.values(QUOTE_TRANSPORT_LABELS)}
          onChange={(value) => setOpen({ ...open, transport: transportFromLabel(value) })}
          placeholder="Icono"
          label="Icono de salida / regreso"
          display={
            open.transport === "none" ? (
              <span
                style={{
                  display: "inline-flex",
                  width: "22px",
                  height: "22px",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px dashed #9aa7bd",
                  borderRadius: "50%",
                  fontSize: "8px",
                  color: "#5d6b84",
                }}
              >
                icono
              </span>
            ) : (
              icon
            )
          }
        />
      ) : (
        icon
      ),
    section: (id, area, content) => {
      if (!open) return content;
      const order = visibleSections(open, area);
      const position = order.indexOf(id);
      const custom = open.sections.find((section) => section.id === id);
      return (
        <div className="quote-section">
          <div className="quote-section-tools" data-area={area}>
            <SectionTool
              label="Subir sección"
              disabled={position <= 0}
              onClick={() => setOpen(moveSection(open, area, id, -1))}
            >
              <ChevronUp aria-hidden="true" strokeWidth={2.5} className="h-3 w-3" />
            </SectionTool>
            <SectionTool
              label="Bajar sección"
              disabled={position >= order.length - 1}
              onClick={() => setOpen(moveSection(open, area, id, 1))}
            >
              <ChevronDown aria-hidden="true" strokeWidth={2.5} className="h-3 w-3" />
            </SectionTool>
            {custom ? (
              <>
                <SectionTool
                  label={`Viñeta: ${MARKER_LABELS[custom.marker]} (cambiar)`}
                  onClick={() =>
                    setOpen(
                      updateCustomSection(open, id, {
                        marker:
                          QUOTE_ROW_MARKERS[(QUOTE_ROW_MARKERS.indexOf(custom.marker) + 1) % QUOTE_ROW_MARKERS.length],
                      })
                    )
                  }
                >
                  {MARKER_ICONS[custom.marker]}
                </SectionTool>
                <SectionTool label="Quitar sección" danger onClick={() => setOpen(removeCustomSection(open, id))}>
                  <Trash2 aria-hidden="true" strokeWidth={2.25} className="h-3 w-3" />
                </SectionTool>
              </>
            ) : (
              <SectionTool
                label="Ocultar sección"
                onClick={() => setOpen(setSectionHidden(open, id as QuoteSectionId, true))}
              >
                <EyeOff aria-hidden="true" strokeWidth={2.25} className="h-3 w-3" />
              </SectionTool>
            )}
          </div>
          {content}
        </div>
      );
    },
    addSection:
      open && open.sections.length < QUOTE_MAX_CUSTOM_SECTIONS ? (
        <button
          type="button"
          onClick={() => setOpen(addCustomSection(open))}
          className="mx-auto mt-4 flex items-center gap-1.5 rounded-full border border-dashed border-brand-400 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-700 transition-colors hover:border-brand-500 hover:bg-brand-200/40"
        >
          <Plus aria-hidden="true" strokeWidth={2.25} className="h-3.5 w-3.5" />
          Agregar sección
        </button>
      ) : null,
    sectionText: (id, part) => {
      const section = open?.sections.find((item) => item.id === id);
      if (!open || !section) return null;
      return (
        <InlineField
          variant="text"
          value={section[part]}
          display={<RichText text={section[part]} />}
          onChange={(value) =>
            setOpen(updateCustomSection(open, id, part === "heading" ? { heading: value } : { label: value }))
          }
          placeholder={part === "heading" ? "Título de la sección" : "Etiqueta (opcional)"}
          label={part === "heading" ? "Título de la sección" : "Etiqueta de la sección"}
        />
      );
    },
    row: (list, index, content) => {
      const items = rowsOf(list);
      return (
        <IncludeField
          item={items[index]}
          onChange={(item) => setRows(list, items.map((current, i) => (i === index ? item : current)))}
          onRemove={() => setRows(list, items.filter((_, i) => i !== index))}
          label={`${rowLabel(list)} ${index + 1}`}
        >
          {content}
        </IncludeField>
      );
    },
    rowProps: (list, index) => {
      const items = rowsOf(list);
      return dragProps(list, index, items.length, (from, to) => {
        if (from === to || to < 0 || to >= items.length) return;
        setRows(list, moveItem(items, from, to));
      });
    },
    addRow: (list) => (
      <button
        type="button"
        onClick={() => setRows(list, [...rowsOf(list), {}])}
        aria-label={`Agregar ${rowLabel(list).toLowerCase()}`}
        title={`Agregar ${rowLabel(list).toLowerCase()}`}
        className={
          list === "payment"
            ? "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-dashed border-white/50 text-white transition-colors hover:bg-white/10"
            : "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-dashed border-brand-400 text-brand-700 transition-colors hover:border-brand-500 hover:bg-brand-200/40"
        }
      >
        <Plus aria-hidden="true" strokeWidth={2.25} className={list === "payment" ? "h-3 w-3" : "h-3.5 w-3.5"} />
      </button>
    ),
  };
}

// Renders the quote at its real 816x1056 size and scales it: by default to the available
// width, up to MAX_SCALE so it's easier to read and fill in (see QuoteZoom).
export function QuotePreview({
  data,
  folio,
  zoom = "fit",
  onScaleChange,
  onChange,
  lockedFields = [],
  plainFields = [],
  vendorOptions,
}: QuotePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(PAGE_WIDTH);
  // Taller than the real page while editing; see QuoteDocument.
  const [pageHeight, setPageHeight] = useState(PAGE_HEIGHT);
  const [drag, setDrag] = useState<RowDrag>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(([entry]) => setContainerWidth(entry.contentRect.width));
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const fitScale = Math.min(MAX_SCALE, containerWidth / PAGE_WIDTH);
  const scale = zoom === "fit" ? fitScale : zoom;

  useEffect(() => {
    onScaleChange?.(scale);
  }, [scale, onScaleChange]);

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
    // Zoomed in past the editor's width, the page scrolls sideways.
    <div ref={containerRef} className={scale > fitScale + 0.001 ? "w-full overflow-x-auto pb-4" : "w-full"}>
      <style>{QUOTE_DOCUMENT_RESET_CSS}</style>
      {onChange ? <style>{INLINE_FIELD_CSS}</style> : null}
      <div
        className="mx-auto overflow-hidden rounded-xl shadow-[0_4px_24px_rgba(28,41,66,0.12)]"
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
