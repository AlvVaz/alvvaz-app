"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

import type { QuoteIncludeItem, QuoteIncludePart } from "@/lib/quotes/types";

type InlineFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  // Optional fields show a neutral dashed underline when empty instead of yellow.
  optional?: boolean;
};

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
@media (prefers-reduced-motion: reduce) { .quote-field, .quote-include, .quote-include-body { transition: none; } .quote-popover { animation: none; } }
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
  const fields = Array.from(
    root.querySelectorAll<HTMLElement>('.quote-field[role="button"], .quote-stars')
  );
  const next = fields[fields.indexOf(anchor) + direction];
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
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
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
};

function TextPopover({ anchor, value, onChange, placeholder, label, onClose }: TextPopoverProps) {
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
      <p className="mt-2 text-[11px] text-slate-500">
        <b>Enter</b> listo · <b>Tab</b> siguiente · <b>Esc</b> deshacer
      </p>
    </FieldPopover>
  );
}

type FieldTriggerProps = {
  value: string;
  // Shown instead of `value` (e.g. formatted text); leave empty to show the placeholder.
  children?: ReactNode;
  state: "filled" | "missing" | "optional";
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
        } else if (event.key === "Tab" && !isOpen) {
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

type ChoiceFieldProps = {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
};

// Like InlineField, but the popover lists fixed choices instead of a text input.
export function ChoiceField({ value, options, onChange, placeholder, label }: ChoiceFieldProps) {
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
      />
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
export function InlineField({ value, onChange, placeholder, label, optional = false }: InlineFieldProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  return (
    <>
      <FieldTrigger
        value={value}
        state={value.trim() ? "filled" : optional ? "optional" : "missing"}
        placeholder={placeholder}
        label={label}
        isOpen={Boolean(anchor)}
        onOpen={setAnchor}
      />
      {anchor ? (
        <TextPopover
          anchor={anchor}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          label={label}
          onClose={() => setAnchor(null)}
        />
      ) : null}
    </>
  );
}
