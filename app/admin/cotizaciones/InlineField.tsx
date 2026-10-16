"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

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
.quote-field[data-state="filled"], .quote-field[data-state="locked"] { text-decoration-color: #22a06b; }
.quote-field[data-state="missing"] { text-decoration-color: #e2b203; }
.quote-field[data-state="optional"] { text-decoration-style: dashed; text-decoration-thickness: 1px; text-decoration-color: #94a3b8; }
.quote-field[data-state="locked"] { cursor: default; }
.quote-field[role="button"] { cursor: pointer; }
.quote-field[role="button"]:hover, .quote-field[role="button"]:focus-visible, .quote-field[data-open="true"] { background-color: color-mix(in srgb, currentColor 10%, transparent); text-underline-offset: 6px; }
.quote-field[data-open="true"], .quote-field[role="button"]:focus-visible { text-decoration-color: #2f6db5; text-decoration-style: solid; text-decoration-thickness: 2px; }
.quote-stars[data-state="filled"] { box-shadow: 0 3px 0 -1px #22a06b; }
.quote-stars[data-state="missing"] { box-shadow: 0 3px 0 -1px #e2b203; }
.quote-include-controls { display: none; position: absolute; top: 4px; right: 0; gap: 2px; }
.quote-include:hover .quote-include-controls, .quote-include:focus-within .quote-include-controls { display: flex; }
.quote-popover { animation: quote-popover-in 140ms ease-out; }
@keyframes quote-popover-in { from { opacity: 0; transform: translateY(-4px) scale(0.98); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .quote-field { transition: none; } .quote-popover { animation: none; } }
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
function openSiblingField(anchor: HTMLElement, direction: 1 | -1) {
  const root = anchor.closest(".quote-document") ?? document;
  const fields = Array.from(root.querySelectorAll<HTMLElement>('.quote-field[role="button"]'));
  const next = fields[fields.indexOf(anchor) + direction];
  if (next) {
    next.focus();
    next.click();
  } else {
    anchor.focus();
  }
}

type FieldPopoverProps = {
  anchor: HTMLElement;
  label: string;
  onClose: () => void;
  children: ReactNode;
};

// Floating card anchored to a field. Closes on outside click or Esc; Tab moves to the next field.
export function FieldPopover({ anchor, label, onClose, children }: FieldPopoverProps) {
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
          placeholder={`Ej. ${placeholder}`}
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
  state: "filled" | "missing" | "optional";
  placeholder: string;
  label: string;
  isOpen: boolean;
  onOpen: (anchor: HTMLElement) => void;
};

// The underlined value on the document; click, Enter or Space opens its popover.
export function FieldTrigger({ value, state, placeholder, label, isOpen, onOpen }: FieldTriggerProps) {
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
        }
      }}
    >
      {value}
    </span>
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
