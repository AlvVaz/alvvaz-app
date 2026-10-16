"use client";

import { useState } from "react";

import {
  formatQuoteTime,
  formatTravelRange,
  fromLiquidationParts,
  fromShortDate,
  MONTHS_LONG,
  parseIsoDate,
  parseQuoteTime,
  type QuoteTime,
  toIsoDate,
  toLiquidationParts,
  toShortDate,
} from "@/lib/quotes/dates";
import type { QuoteData } from "@/lib/quotes/types";

import { FieldPopover, FieldTrigger } from "./InlineField";

const WEEKDAYS = ["D", "L", "M", "M", "J", "V", "S"];

const navButton =
  "flex h-8 w-8 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-brand-900";

type MiniCalendarProps = {
  start: string | null;
  end: string | null;
  // Month to show when nothing is selected yet (defaults to today).
  initialMonth?: string | null;
  // Range mode previews the range under the cursor once a start is picked.
  range?: boolean;
  onPick: (iso: string) => void;
};

function MiniCalendar({ start, end, initialMonth, range = false, onPick }: MiniCalendarProps) {
  const today = toIsoDate(new Date());
  const [view, setView] = useState(() => {
    const seed = start ?? initialMonth;
    const base = seed ? parseIsoDate(seed) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const [hovered, setHovered] = useState<string | null>(null);

  const year = view.getFullYear();
  const month = view.getMonth();
  const leadingBlanks = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const rangeEnd = end ?? (range && start && hovered && hovered > start ? hovered : null);

  return (
    <div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setView(new Date(year, month - 1, 1))}
          aria-label="Mes anterior"
          className={navButton}
        >
          ‹
        </button>
        <span className="text-sm font-semibold capitalize text-brand-950">
          {MONTHS_LONG[month]} {year}
        </span>
        <button
          type="button"
          onClick={() => setView(new Date(year, month + 1, 1))}
          aria-label="Mes siguiente"
          className={navButton}
        >
          ›
        </button>
      </div>
      <div className="mt-2 grid grid-cols-7 text-center text-[10px] font-semibold text-slate-400">
        {WEEKDAYS.map((day, index) => (
          <span key={index} className="py-1">
            {day}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1" onMouseLeave={() => setHovered(null)}>
        {Array.from({ length: leadingBlanks }, (_, index) => (
          <span key={`blank-${index}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, index) => {
          const iso = toIsoDate(new Date(year, month, index + 1));
          const isEndpoint = iso === start || iso === rangeEnd;
          const isInRange = Boolean(start && rangeEnd && iso > start && iso < rangeEnd);
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onPick(iso)}
              onMouseEnter={() => setHovered(iso)}
              aria-pressed={isEndpoint}
              className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm transition ${
                isEndpoint
                  ? "bg-brand-950 font-semibold text-white"
                  : isInRange
                    ? "bg-brand-100 text-brand-900"
                    : "text-slate-700 hover:bg-slate-100"
              } ${iso === today && !isEndpoint ? "font-bold text-brand-700 ring-1 ring-brand-300" : ""}`}
            >
              {index + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}

type DateFieldProps = {
  data: QuoteData;
  onChange: (data: QuoteData) => void;
  placeholder: string;
  label: string;
};

// "Fechas de viaje": pick arrival, then return, like a hotel booking.
export function TravelDatesField({ data, onChange, placeholder, label }: DateFieldProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [pendingStart, setPendingStart] = useState<string | null>(null);

  const close = () => {
    setAnchor(null);
    setPendingStart(null);
  };

  const start = pendingStart ?? data.travelRange?.start ?? null;
  const end = pendingStart ? null : data.travelRange?.end ?? null;

  const handlePick = (iso: string) => {
    if (pendingStart && iso >= pendingStart) {
      onChange({
        ...data,
        travelRange: { start: pendingStart, end: iso },
        travelDates: formatTravelRange(pendingStart, iso),
      });
      anchor?.focus();
      close();
      return;
    }
    setPendingStart(iso);
  };

  return (
    <>
      <FieldTrigger
        value={data.travelDates}
        state={data.travelDates.trim() ? "filled" : "missing"}
        placeholder={placeholder}
        label={label}
        isOpen={Boolean(anchor)}
        onOpen={setAnchor}
      />
      {anchor ? (
        <FieldPopover anchor={anchor} label={label} onClose={close}>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-600">{label}</p>
          <MiniCalendar start={start} end={end} range onPick={handlePick} />
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2 text-[11px] text-slate-500">
            <span>
              {pendingStart
                ? `Llegada ${formatTravelRange(pendingStart, pendingStart)}. Elige el regreso.`
                : "Elige la fecha de llegada y la de regreso."}
            </span>
            {data.travelDates ? (
              <button
                type="button"
                onClick={() => {
                  onChange({ ...data, travelRange: null, travelDates: "" });
                  close();
                }}
                className="shrink-0 font-semibold text-rose-600 hover:text-rose-700"
              >
                Borrar
              </button>
            ) : null}
          </div>
        </FieldPopover>
      ) : null}
    </>
  );
}

type LiquidationPart = "liquidationDay" | "liquidationMonth" | "liquidationYear";

// Any of the three parts of the "Liquidación" calendar block opens one date picker that fills all three.
export function LiquidationDateField({
  data,
  onChange,
  placeholder,
  label,
  part,
}: DateFieldProps & { part: LiquidationPart }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const selected = fromLiquidationParts(data.liquidationDay, data.liquidationMonth, data.liquidationYear);

  return (
    <>
      <FieldTrigger
        value={data[part]}
        state={data[part].trim() ? "filled" : "missing"}
        placeholder={placeholder}
        label={label}
        isOpen={Boolean(anchor)}
        onOpen={setAnchor}
      />
      {anchor ? (
        <FieldPopover anchor={anchor} label="Liquidación del viaje" onClose={() => setAnchor(null)}>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-600">
            Liquidación del viaje
          </p>
          <MiniCalendar
            start={selected}
            end={null}
            onPick={(iso) => {
              onChange({ ...data, ...toLiquidationParts(iso) });
              anchor.focus();
              setAnchor(null);
            }}
          />
        </FieldPopover>
      ) : null}
    </>
  );
}

type FlightDatePart = "departureDate" | "returnDate";

// Salida / Regreso date: one calendar, written as "7 ene". Opens on the travel dates' month when empty.
export function FlightDateField({
  data,
  onChange,
  placeholder,
  label,
  part,
}: DateFieldProps & { part: FlightDatePart }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const travelDate = part === "departureDate" ? data.travelRange?.start : data.travelRange?.end;
  const year = travelDate ? parseIsoDate(travelDate).getFullYear() : new Date().getFullYear();
  const selected = data[part] ? fromShortDate(data[part], year) : null;

  return (
    <>
      <FieldTrigger
        value={data[part]}
        state={data[part].trim() ? "filled" : "missing"}
        placeholder={placeholder}
        label={label}
        isOpen={Boolean(anchor)}
        onOpen={setAnchor}
      />
      {anchor ? (
        <FieldPopover anchor={anchor} label={label} onClose={() => setAnchor(null)}>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-600">{label}</p>
          <MiniCalendar
            start={selected}
            end={null}
            initialMonth={travelDate}
            onPick={(iso) => {
              onChange({ ...data, [part]: toShortDate(iso) });
              anchor.focus();
              setAnchor(null);
            }}
          />
        </FieldPopover>
      ) : null}
    </>
  );
}

type FlightTimePart = "departureTime" | "returnTime";

const HOURS = Array.from({ length: 12 }, (_, index) => index + 1);
const QUICK_MINUTES = Array.from({ length: 12 }, (_, index) => index * 5);

const timeButton = (active: boolean) =>
  `flex h-8 items-center justify-center rounded-lg text-sm transition ${
    active ? "bg-brand-950 font-semibold text-white" : "text-slate-700 hover:bg-slate-100"
  }`;

// Salida / Regreso time: hour, minute and AM/PM, written as "7:09 AM". Updates the document live.
export function FlightTimeField({
  data,
  onChange,
  placeholder,
  label,
  part,
}: DateFieldProps & { part: FlightTimePart }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const time = parseQuoteTime(data[part]);

  const setTime = (next: Partial<QuoteTime>) => {
    const merged: QuoteTime = { hour: 12, minute: 0, period: "AM", ...time, ...next };
    onChange({ ...data, [part]: formatQuoteTime(merged) });
  };

  const close = () => {
    anchor?.focus();
    setAnchor(null);
  };

  return (
    <>
      <FieldTrigger
        value={data[part]}
        state={data[part].trim() ? "filled" : "missing"}
        placeholder={placeholder}
        label={label}
        isOpen={Boolean(anchor)}
        onOpen={setAnchor}
      />
      {anchor ? (
        <FieldPopover anchor={anchor} label={label} onClose={() => setAnchor(null)}>
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-600">{label}</p>
            <span className="text-sm font-semibold text-brand-950">{data[part] || "—"}</span>
          </div>

          <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Hora</p>
          <div className="mt-1 grid grid-cols-6 gap-1">
            {HOURS.map((hour) => (
              <button
                key={hour}
                type="button"
                onClick={() => setTime({ hour })}
                aria-pressed={time?.hour === hour}
                className={timeButton(time?.hour === hour)}
              >
                {hour}
              </button>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Minutos</p>
            <label className="flex items-center gap-1 text-[11px] text-slate-500">
              Exacto
              <input
                type="number"
                min={0}
                max={59}
                value={time ? time.minute : ""}
                onChange={(event) => {
                  const minute = Number(event.target.value);
                  if (Number.isInteger(minute) && minute >= 0 && minute <= 59) setTime({ minute });
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    close();
                  }
                }}
                aria-label="Minuto exacto"
                className="w-14 rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-900 outline-none focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-200"
              />
            </label>
          </div>
          <div className="mt-1 grid grid-cols-6 gap-1">
            {QUICK_MINUTES.map((minute) => (
              <button
                key={minute}
                type="button"
                onClick={() => setTime({ minute })}
                aria-pressed={time?.minute === minute}
                className={timeButton(time?.minute === minute)}
              >
                :{String(minute).padStart(2, "0")}
              </button>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
            <div className="inline-flex rounded-full border border-brand-200 p-0.5">
              {(["AM", "PM"] as const).map((period) => (
                <button
                  key={period}
                  type="button"
                  onClick={() => setTime({ period })}
                  aria-pressed={time?.period === period}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    time?.period === period ? "bg-brand-950 text-white" : "text-brand-700 hover:text-brand-950"
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={close}
              className="rounded-full bg-brand-950 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-brand-900"
            >
              Listo
            </button>
          </div>
        </FieldPopover>
      ) : null}
    </>
  );
}
