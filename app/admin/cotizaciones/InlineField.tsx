"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";

import {
  formatMinorAges,
  getMinorAges,
  type QuoteData,
  type QuoteIncludeItem,
  type QuoteIncludePart,
} from "@/lib/quotes/types";

type InlineFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  // Optional fields show a neutral dashed underline when empty instead of yellow.
  optional?: boolean;
  // "text": one of Abierta's fixed texts. No underline (a dotted box on hover), skipped by
  // Tab, "**text**" is bold, and empty hides it on the PDF.
  variant?: "text";
  // Template text a "text" field can go back to ("Restaurar").
  defaultValue?: string;
  // Shown on the document instead of the plain value (e.g. with the bold parts).
  display?: ReactNode;
  // Adds a remove button to the popover (e.g. "Quitar categoría").
  onRemove?: () => void;
  removeLabel?: string;
  // Extra buttons in the popover (e.g. moving a category); each closes the popover first.
  actions?: FieldAction[];
};

export type FieldAction = { label: string; title: string; onClick: () => void; disabled?: boolean };

// Underline only: follows the text, never overlaps neighbors and doesn't move the layout.
export const INLINE_FIELD_CSS = `
.quote-field { outline: none; border-radius: 3px; text-decoration-line: underline; text-decoration-thickness: 2px; text-underline-offset: 4px; text-decoration-skip-ink: none; transition: background-color 150ms ease, text-underline-offset 150ms ease, text-decoration-color 150ms ease; }
.quote-field:empty::before { content: attr(data-placeholder); color: color-mix(in srgb, currentColor 50%, transparent); font-style: italic; }
.quote-repeat:empty::before { content: attr(data-placeholder); color: color-mix(in srgb, currentColor 50%, transparent); font-style: italic; }
.quote-include-hint { color: color-mix(in srgb, currentColor 50%, transparent); font-style: italic; }
.quote-field[data-state="filled"], .quote-field[data-state="locked"] { text-decoration-color: #22a06b; }
.quote-field[data-state="missing"] { text-decoration-color: #e2b203; }
.quote-field[data-state="optional"] { text-decoration-style: dashed; text-decoration-thickness: 1px; text-decoration-color: #94a3b8; }
.quote-field[data-state="locked"] { cursor: default; }
.quote-field[role="button"] { cursor: pointer; }
.quote-field[role="button"]:hover, .quote-field[role="button"]:focus-visible, .quote-field[data-open="true"] { background-color: color-mix(in srgb, currentColor 10%, transparent); text-underline-offset: 6px; }
.quote-field[data-open="true"], .quote-field[role="button"]:focus-visible { text-decoration-color: #2f6db5; text-decoration-style: solid; text-decoration-thickness: 2px; }
.quote-stars[data-state="filled"] { box-shadow: 0 3px 0 -1px #22a06b; }
.quote-stars[data-state="missing"] { box-shadow: 0 3px 0 -1px #e2b203; }
.quote-include { cursor: grab; transition: opacity 150ms ease; }
.quote-include-body { border-radius: 4px; transition: background-color 150ms ease, box-shadow 150ms ease; }
.quote-include .quote-field, .quote-include .quote-field[role="button"]:hover, .quote-include .quote-field[role="button"]:focus-visible, .quote-include .quote-field[data-open="true"] { text-decoration-line: none; background-color: transparent; }
.quote-include:hover .quote-include-body, .quote-include:has(.quote-field:focus-visible) .quote-include-body, .quote-include:has(.quote-field[data-open="true"]) .quote-include-body { background-color: #e9f6ef; box-shadow: 0 0 0 4px #e9f6ef; }
.quote-include.is-dragging { opacity: 0.4; }
.quote-include.is-drop-target { background-color: color-mix(in srgb, #2f6db5 8%, transparent); box-shadow: 0 0 0 2px #2f6db5; }
.quote-popover { animation: quote-popover-in 140ms ease-out; }
@keyframes quote-popover-in { from { opacity: 0; transform: translateY(-4px) scale(0.98); } to { opacity: 1; transform: none; } }
.quote-field[data-state="text"] { text-decoration-line: none; }
.quote-field[data-state="text"]:hover, .quote-field[data-state="text"]:focus-visible, .quote-field[data-state="text"][data-open="true"] { outline: 1px dotted color-mix(in srgb, currentColor 70%, transparent); outline-offset: 2px; }
.quote-aside .quote-include:hover .quote-include-body, .quote-aside .quote-include:has(.quote-field:focus-visible) .quote-include-body, .quote-aside .quote-include:has(.quote-field[data-open="true"]) .quote-include-body { background-color: rgba(255,255,255,0.14); box-shadow: 0 0 0 3px rgba(255,255,255,0.14); }
.quote-section { position: relative; }
.quote-section::before { content: ""; position: absolute; inset: -4px -8px; border: 1px dashed transparent; border-radius: 8px; pointer-events: none; transition: border-color 150ms ease; }
.quote-section:hover::before, .quote-section:focus-within::before { border-color: #9fb6d6; }
.quote-section-tools { position: absolute; top: 0; z-index: 3; display: flex; flex-direction: column; gap: 3px; opacity: 0; transition: opacity 150ms ease; }
.quote-section-tools[data-area="main"] { left: -37px; }
.quote-section-tools[data-area="aside"] { right: -27px; }
.quote-section:hover > .quote-section-tools, .quote-section:focus-within > .quote-section-tools { opacity: 1; }
@media (prefers-reduced-motion: reduce) { .quote-field, .quote-include, .quote-include-body, .quote-section::before, .quote-section-tools { transition: none; } .quote-popover { animation: none; } }
`;

const POPOVER_WIDTH = 300;
const POPOVER_GAP = 8;
const VIEWPORT_MARGIN = 12;

type Position = { top: number; left: number };

// Below the field when it fits, otherwise above; always kept inside the viewport.
function getPosition(anchor: HTMLElement, popover: HTMLElement | null): Position {
  const rect = anchor.getBoundingClientRect();
  const height = popover?.offsetHeight ?? 120;
  const fitsBelow = rect.bottom + POPOVER_GAP + height <= window.innerHeight - VIEWPORT_MARGIN;
  const top = fitsBelow
    ? rect.bottom + POPOVER_GAP
    : Math.max(VIEWPORT_MARGIN, rect.top - POPOVER_GAP - height);
  const left = Math.min(
    Math.max(VIEWPORT_MARGIN, rect.left),
    window.innerWidth - POPOVER_WIDTH - VIEWPORT_MARGIN
  );
  return { top, left };
}

// Opens the next (Tab) or previous (Shift+Tab) editable field on the same document.
// The stars have no popover, so they only get focus (the selected star, or the first).
// Returns false when there is none, so a closed field can let Tab leave the document.
export function openSiblingField(anchor: HTMLElement, direction: 1 | -1) {
  const root = anchor.closest(".quote-document") ?? document;
  // Abierta's fixed texts ("text" fields) are skipped, so Tab goes from value to value.
  const fields = Array.from(
    root.querySelectorAll<HTMLElement>('.quote-field[role="button"]:not([data-state="text"]), .quote-stars')
  );
  let index = fields.indexOf(anchor);
  if (index < 0) {
    // Tab from a skipped field: carry on from where it sits on the page.
    const after = fields.findIndex(
      (field) => anchor.compareDocumentPosition(field) & Node.DOCUMENT_POSITION_FOLLOWING
    );
    index = (after < 0 ? fields.length : after) - (direction === 1 ? 1 : 0);
  }
  const next = fields[index + direction];
  if (next?.classList.contains("quote-stars")) {
    const star =
      next.querySelector<HTMLElement>('[aria-checked="true"]') ?? next.querySelector<HTMLElement>("button");
    star?.focus();
    return true;
  }
  if (next) {
    next.focus();
    next.click();
    return true;
  }
  anchor.focus();
  return false;
}

type FieldPopoverProps = {
  anchor: HTMLElement;
  label: string;
  onClose: () => void;
  children: ReactNode;
  // Tab moves between this popover's inputs first, then on to the next field.
  tabBetweenInputs?: boolean;
};

// Floating card anchored to a field. Closes on outside click or Esc; Tab moves to the next field.
export function FieldPopover({ anchor, label, onClose, children, tabBetweenInputs = false }: FieldPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Position>(() => getPosition(anchor, null));

  useLayoutEffect(() => {
    const update = () => setPosition(getPosition(anchor, popoverRef.current));
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    // Re-place it when its content grows (e.g. age boxes appearing as Menores is typed).
    const observer = new ResizeObserver(update);
    if (popoverRef.current) observer.observe(popoverRef.current);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
      observer.disconnect();
    };
  }, [anchor]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (popoverRef.current?.contains(target) || anchor.contains(target)) return;
      onClose();
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [anchor, onClose]);

  // Pickers with nothing to type in (calendars, the time picker) leave focus on the field
  // itself, where the Tab handler below never sees the key; close and move on from there too.
  useEffect(() => {
    const handleAnchorKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Tab") return;
      event.preventDefault();
      onClose();
      openSiblingField(anchor, event.shiftKey ? -1 : 1);
    };
    anchor.addEventListener("keydown", handleAnchorKeyDown);
    return () => anchor.removeEventListener("keydown", handleAnchorKeyDown);
  }, [anchor, onClose]);

  return createPortal(
    <div
      ref={popoverRef}
      role="dialog"
      aria-label={label}
      className="quote-popover fixed z-50 rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_12px_32px_rgba(28,41,66,0.18)]"
      style={{ top: position.top, left: position.left, width: POPOVER_WIDTH }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onClose();
          anchor.focus();
        } else if (event.key === "Tab") {
          if (tabBetweenInputs) {
            const inputs = Array.from(popoverRef.current?.querySelectorAll("input") ?? []);
            const target = inputs.indexOf(document.activeElement as HTMLInputElement) + (event.shiftKey ? -1 : 1);
            if (target >= 0 && target < inputs.length) return;
          }
          event.preventDefault();
          onClose();
          openSiblingField(anchor, event.shiftKey ? -1 : 1);
        }
      }}
    >
      {children}
    </div>,
    document.body
  );
}

type TextPopoverProps = {
  anchor: HTMLElement;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  onClose: () => void;
  isText?: boolean;
  defaultValue?: string;
  onRemove?: () => void;
  removeLabel?: string;
  actions?: FieldAction[];
};

function TextPopover({
  anchor,
  value,
  onChange,
  placeholder,
  label,
  onClose,
  isText = false,
  defaultValue,
  onRemove,
  removeLabel = "Quitar",
  actions = [],
}: TextPopoverProps) {
  // Esc restores the value the field had when the popover opened.
  const [initialValue] = useState(value);

  return (
    <FieldPopover anchor={anchor} label={label} onClose={onClose}>
      <label className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-600">
        {label}
        <input
          autoFocus
          value={value}
          maxLength={300}
          onChange={(event) => onChange(event.target.value)}
          onFocus={(event) => event.currentTarget.select()}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onClose();
              anchor.focus();
            } else if (event.key === "Escape") {
              onChange(initialValue);
            }
          }}
          placeholder={placeholder}
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-900 outline-none transition focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-200"
        />
      </label>
      {isText ? (
        <p className="mt-2 text-[11px] text-slate-500">
          <b>**texto**</b> en negritas · vacío no se muestra en el PDF
        </p>
      ) : null}
      <p className="mt-2 text-[11px] text-slate-500">
        <b>Enter</b> listo · <b>Tab</b> siguiente · <b>Esc</b> deshacer
      </p>
      {(defaultValue !== undefined && value !== defaultValue) || onRemove || actions.length ? (
        <div className="mt-2 flex items-center justify-end gap-4 border-t border-slate-100 pt-2">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              title={action.title}
              disabled={action.disabled}
              onClick={() => {
                // Close first: after a move this field may show something else.
                onClose();
                action.onClick();
              }}
              className="text-[11px] font-semibold text-brand-700 hover:text-brand-900 disabled:cursor-default disabled:opacity-40"
            >
              {action.label}
            </button>
          ))}
          {defaultValue !== undefined && value !== defaultValue ? (
            <button
              type="button"
              onClick={() => onChange(defaultValue)}
              className="text-[11px] font-semibold text-brand-700 hover:text-brand-900"
            >
              Restaurar
            </button>
          ) : null}
          {onRemove ? (
            <button
              type="button"
              onClick={() => {
                // Close first: after removal this field may show something else.
                onClose();
                onRemove();
              }}
              className="text-[11px] font-semibold text-rose-600 hover:text-rose-700"
            >
              {removeLabel}
            </button>
          ) : null}
        </div>
      ) : null}
    </FieldPopover>
  );
}

type FieldTriggerProps = {
  value: string;
  // Shown instead of `value` (e.g. formatted text); leave empty to show the placeholder.
  children?: ReactNode;
  state: "filled" | "missing" | "optional" | "text";
  placeholder: string;
  label: string;
  isOpen: boolean;
  onOpen: (anchor: HTMLElement) => void;
};

// The underlined value on the document; click, Enter or Space opens its popover.
// Tab opens the next field's popover, same as Tab inside a popover (e.g. after
// picking a date, which closes the calendar and leaves focus here).
export function FieldTrigger({ value, children, state, placeholder, label, isOpen, onOpen }: FieldTriggerProps) {
  return (
    <span
      role="button"
      tabIndex={0}
      aria-label={`${label}: ${value || "vacío"}`}
      aria-haspopup="dialog"
      aria-expanded={isOpen}
      data-placeholder={placeholder}
      data-state={state}
      data-open={isOpen}
      className="quote-field"
      onClick={(event) => onOpen(event.currentTarget)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(event.currentTarget);
        } else if (event.key === "Tab" && !isOpen && !event.defaultPrevented) {
          // defaultPrevented: the open popover's listener on this field already moved on
          // (see FieldPopover); this handler then sees the popover as closed.
          if (openSiblingField(event.currentTarget, event.shiftKey ? -1 : 1)) event.preventDefault();
        }
      }}
    >
      {children ?? value}
    </span>
  );
}

const INCLUDE_PARTS: { part: QuoteIncludePart; label: string; placeholder: string }[] = [
  { part: "title", label: "Título", placeholder: "Texto en negritas" },
  { part: "detail", label: "Detalle", placeholder: "Texto normal" },
  { part: "note", label: "Nota", placeholder: "Texto en rojo, entre paréntesis" },
];

type IncludeFieldProps = {
  item: QuoteIncludeItem;
  onChange: (item: QuoteIncludeItem) => void;
  onRemove: () => void;
  label: string;
  // The item as it looks on the PDF.
  children: ReactNode;
};

// One "Incluye" item as a single field; its popover edits title, detail and note together.
export function IncludeField({ item, onChange, onRemove, label, children }: IncludeFieldProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  // Esc restores the item as it was when the popover opened.
  const [initialItem, setInitialItem] = useState(item);
  const text = INCLUDE_PARTS.map(({ part }) => item[part]?.trim()).filter(Boolean).join(" ");

  const close = () => {
    anchor?.focus();
    setAnchor(null);
  };

  return (
    <>
      <FieldTrigger
        value={text}
        state={text ? "filled" : "optional"}
        placeholder="Nuevo item"
        label={label}
        isOpen={Boolean(anchor)}
        onOpen={(element) => {
          setInitialItem(item);
          setAnchor(element);
        }}
      >
        {text ? children : null}
      </FieldTrigger>
      {anchor ? (
        <FieldPopover anchor={anchor} label={label} onClose={() => setAnchor(null)} tabBetweenInputs>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-600">{label}</p>
          <div className="space-y-2">
            {INCLUDE_PARTS.map(({ part, label: partLabel, placeholder }, index) => (
              <label key={part} className="block text-[11px] font-semibold text-slate-600">
                {partLabel}
                <input
                  autoFocus={index === 0}
                  value={item[part] ?? ""}
                  maxLength={300}
                  onChange={(event) => onChange({ ...item, [part]: event.target.value })}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      close();
                    } else if (event.key === "Escape") {
                      onChange(initialItem);
                    }
                  }}
                  placeholder={placeholder}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900 outline-none transition focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-200"
                />
              </label>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
            <p className="text-[11px] text-slate-500">
              <b>Enter</b> listo · <b>Tab</b> siguiente · <b>Esc</b> deshacer
            </p>
            <button
              type="button"
              onClick={() => {
                // Close first: after removal this field shows the next item.
                setAnchor(null);
                onRemove();
              }}
              className="shrink-0 text-[11px] font-semibold text-rose-600 hover:text-rose-700"
            >
              Quitar item
            </button>
          </div>
        </FieldPopover>
      ) : null}
    </>
  );
}

const MINOR_AGES_LABEL = "Edades de los menores";

// Ages past the current Menores count are kept, so lowering it and raising it again restores them.
const withMinorAges = (data: QuoteData, ages: string[]): QuoteData => ({
  ...data,
  minorAges: [...ages, ...data.minorAges.slice(ages.length)],
});

type MinorAgeInputsProps = {
  // One entry per menor (see getMinorAges).
  ages: string[];
  onChange: (ages: string[]) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  autoFocus?: boolean;
};

// "Menor 1 [#] años" boxes, one per line; digits only.
function MinorAgeInputs({ ages, onChange, onKeyDown, autoFocus = false }: MinorAgeInputsProps) {
  return (
    <div className="flex flex-col gap-2">
      {ages.map((age, index) => (
        <label key={index} className="flex items-center gap-3 text-[11px] font-semibold text-slate-600">
          <span className="w-16 shrink-0 whitespace-nowrap">Menor {index + 1}</span>
          <input
            autoFocus={autoFocus && index === 0}
            value={age}
            inputMode="numeric"
            maxLength={2}
            onChange={(event) =>
              onChange(ages.map((current, i) => (i === index ? event.target.value.replace(/\D/g, "") : current)))
            }
            onKeyDown={onKeyDown}
            placeholder="#"
            className="w-12 rounded-xl border border-slate-200 px-2 py-1.5 text-center text-sm font-normal text-slate-900 outline-none transition focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-200"
          />
          <span className="font-normal">años</span>
        </label>
      ))}
    </div>
  );
}

type MinorsFieldProps = {
  data: QuoteData;
  onChange: (data: QuoteData) => void;
  placeholder: string;
  label: string;
};

// Menores count in the "COSTOS POR" header. Its popover also has the ages, right below the
// number: the boxes follow the count as it's typed.
export function MinorsField({ data, onChange, placeholder, label }: MinorsFieldProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  // Esc restores the count and ages as they were when the popover opened.
  const [initial, setInitial] = useState({ minors: data.minors, minorAges: data.minorAges });
  const ages = getMinorAges(data);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      anchor?.focus();
      setAnchor(null);
    } else if (event.key === "Escape") {
      onChange({ ...data, ...initial });
    }
  };

  return (
    <>
      <FieldTrigger
        value={data.minors}
        state={data.minors.trim() ? "filled" : "optional"}
        placeholder={placeholder}
        label={label}
        isOpen={Boolean(anchor)}
        onOpen={(element) => {
          setInitial({ minors: data.minors, minorAges: data.minorAges });
          setAnchor(element);
        }}
      />
      {anchor ? (
        <FieldPopover anchor={anchor} label={label} onClose={() => setAnchor(null)} tabBetweenInputs>
          <label className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-600">
            {label}
            <input
              autoFocus
              value={data.minors}
              inputMode="numeric"
              maxLength={300}
              onChange={(event) => onChange({ ...data, minors: event.target.value })}
              onFocus={(event) => event.currentTarget.select()}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-900 outline-none transition focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-200"
            />
          </label>
          {ages.length ? (
            <div className="mt-3 border-t border-slate-100 pt-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-600">
                {MINOR_AGES_LABEL}
              </p>
              <MinorAgeInputs
                ages={ages}
                onChange={(next) => onChange(withMinorAges(data, next))}
                onKeyDown={handleKeyDown}
              />
            </div>
          ) : null}
          <p className="mt-2 text-[11px] text-slate-500">
            <b>Enter</b> listo · <b>Tab</b> siguiente · <b>Esc</b> deshacer
          </p>
        </FieldPopover>
      ) : null}
    </>
  );
}

type MinorAgesFieldProps = {
  data: QuoteData;
  onChange: (data: QuoteData) => void;
};

// The menores' ages as one field ("(5 Y 8 AÑOS)") in the sidebar's RESUMEN line.
export function MinorAgesField({ data, onChange }: MinorAgesFieldProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  // Esc restores the ages as they were when the popover opened.
  const [initialAges, setInitialAges] = useState(data.minorAges);
  const ages = getMinorAges(data);
  const text = formatMinorAges(ages);

  return (
    <>
      <FieldTrigger
        value={text ? `(${text})` : ""}
        state={ages.every((age) => age.trim()) ? "filled" : "missing"}
        placeholder="(edades)"
        label={MINOR_AGES_LABEL}
        isOpen={Boolean(anchor)}
        onOpen={(element) => {
          setInitialAges(data.minorAges);
          setAnchor(element);
        }}
      />
      {anchor ? (
        <FieldPopover anchor={anchor} label={MINOR_AGES_LABEL} onClose={() => setAnchor(null)} tabBetweenInputs>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-600">
            {MINOR_AGES_LABEL}
          </p>
          <MinorAgeInputs
            autoFocus
            ages={ages}
            onChange={(next) => onChange(withMinorAges(data, next))}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                anchor.focus();
                setAnchor(null);
              } else if (event.key === "Escape") {
                onChange({ ...data, minorAges: initialAges });
              }
            }}
          />
          <p className="mt-3 border-t border-slate-100 pt-2 text-[11px] text-slate-500">
            <b>Enter</b> listo · <b>Tab</b> siguiente · <b>Esc</b> deshacer
          </p>
        </FieldPopover>
      ) : null}
    </>
  );
}

type ChoiceFieldProps = {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  // Small down arrow after the value so it reads as a dropdown (editor only).
  showArrow?: boolean;
  // Shown on the document instead of the value (e.g. Abierta's transport icon).
  display?: ReactNode;
};

// Like InlineField, but the popover lists fixed choices instead of a text input.
export function ChoiceField({
  value,
  options,
  onChange,
  placeholder,
  label,
  showArrow = false,
  display,
}: ChoiceFieldProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  return (
    <>
      <FieldTrigger
        value={value}
        state={value.trim() ? "filled" : "missing"}
        placeholder={placeholder}
        label={label}
        isOpen={Boolean(anchor)}
        onOpen={setAnchor}
      >
        {display ? (
          display
        ) : showArrow && value ? (
          <>
            {value}
            {/* Sized in em so it follows the text; the underline skips it (it isn't text). Inline
                because Tailwind's base styles make every svg a block, which put it on its own line. */}
            <ChevronDown
              aria-hidden="true"
              strokeWidth={2.5}
              style={{
                display: "inline-block",
                width: "1.1em",
                height: "1.1em",
                marginLeft: "0.25em",
                verticalAlign: "-0.2em",
                transform: anchor ? "rotate(180deg)" : undefined,
                transition: "transform 150ms ease",
              }}
            />
          </>
        ) : undefined}
      </FieldTrigger>
      {anchor ? (
        <FieldPopover anchor={anchor} label={label} onClose={() => setAnchor(null)}>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-600">{label}</p>
          <div className="flex flex-col gap-1">
            {options.map((option, index) => (
              <button
                key={option}
                type="button"
                autoFocus={option === value || (!options.includes(value) && index === 0)}
                aria-pressed={option === value}
                onClick={() => {
                  onChange(option);
                  anchor.focus();
                  setAnchor(null);
                }}
                className={`rounded-lg px-3 py-2 text-left text-sm transition ${
                  option === value ? "bg-brand-950 font-semibold text-white" : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </FieldPopover>
      ) : null}
    </>
  );
}

// Shows the value on the document; clicking it opens a small popover to type in.
export function InlineField({
  value,
  onChange,
  placeholder,
  label,
  optional = false,
  variant,
  defaultValue,
  display,
  onRemove,
  removeLabel,
  actions,
}: InlineFieldProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  return (
    <>
      <FieldTrigger
        value={value}
        state={variant === "text" ? "text" : value.trim() ? "filled" : optional ? "optional" : "missing"}
        placeholder={placeholder}
        label={label}
        isOpen={Boolean(anchor)}
        onOpen={setAnchor}
      >
        {/* Empty stays empty so the placeholder shows. */}
        {value ? display : undefined}
      </FieldTrigger>
      {anchor ? (
        <TextPopover
          anchor={anchor}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          label={label}
          onClose={() => setAnchor(null)}
          isText={variant === "text"}
          defaultValue={defaultValue}
          onRemove={onRemove}
          removeLabel={removeLabel}
          actions={actions}
        />
      ) : null}
    </>
  );
}
