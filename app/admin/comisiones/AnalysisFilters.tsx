"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";

type FilterMode = "range" | "month" | "year";

type AnalysisFiltersProps = {
  mode: FilterMode;
  years: number[];
  currentYear: number;
  currentMonth: number;
  selectedYear: number;
  selectedMonth: number;
  rangeFrom: string;
  rangeTo: string;
};

type Option = {
  value: string;
  label: string;
};

const monthOptions: Option[] = [
  { value: "01", label: "Enero" },
  { value: "02", label: "Febrero" },
  { value: "03", label: "Marzo" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Mayo" },
  { value: "06", label: "Junio" },
  { value: "07", label: "Julio" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" },
];

function Dropdown({
  value,
  options,
  active,
  ariaLabel,
  onChange,
}: {
  value: string;
  options: Option[];
  active: boolean;
  ariaLabel: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const selected = options.find((option) => option.value === value) ?? options[0];

  return (
    <div
      ref={wrapperRef}
      className="relative"
      tabIndex={0}
      onBlur={(event) => {
        const next = event.relatedTarget as Node | null;
        if (!wrapperRef.current || (next && wrapperRef.current.contains(next))) return;
        setOpen(false);
      }}
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((prev) => !prev);
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className={cn(
          "inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]",
          active
            ? "border-brand-500 text-brand-700"
            : "border-brand-200 text-brand-600 hover:border-brand-400"
        )}
      >
        <span>{selected?.label ?? value}</span>
        <span className="text-[10px]">▼</span>
      </button>

      {open ? (
        <div
          role="listbox"
          className="absolute right-0 z-20 mt-2 min-w-[160px] rounded-2xl border border-brand-200 bg-white p-1 shadow-lg"
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={(event) => {
                  event.stopPropagation();
                  onChange(option.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em]",
                  isSelected
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:bg-brand-50 hover:text-brand-700"
                )}
              >
                <span>{option.label}</span>
                {isSelected ? <span className="text-[10px]">●</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function AnalysisFilters({
  mode,
  years,
  currentYear,
  currentMonth,
  selectedYear,
  selectedMonth,
  rangeFrom,
  rangeTo,
}: AnalysisFiltersProps) {
  const router = useRouter();
  const [fromValue, setFromValue] = useState(rangeFrom);
  const [toValue, setToValue] = useState(rangeTo);

  useEffect(() => {
    setFromValue(rangeFrom);
  }, [rangeFrom]);

  useEffect(() => {
    setToValue(rangeTo);
  }, [rangeTo]);

  const yearOptions = useMemo<Option[]>(
    () => years.map((year) => ({ value: String(year), label: String(year) })),
    [years]
  );

  const handleModeChange = (nextMode: FilterMode) => {
    if (nextMode === "range") {
      const params = new URLSearchParams();
      params.set("mode", "range");
      if (fromValue) params.set("from", fromValue);
      if (toValue) params.set("to", toValue);
      router.push(`/admin/comisiones?${params.toString()}`);
      return;
    }

    if (nextMode === "month") {
      const monthValue = String(selectedMonth || currentMonth).padStart(2, "0");
      const yearValue = String(selectedYear || currentYear);
      router.push(
        `/admin/comisiones?mode=month&year=${encodeURIComponent(
          yearValue
        )}&month=${encodeURIComponent(monthValue)}`
      );
      return;
    }

    const yearValue = String(selectedYear || currentYear);
    router.push(`/admin/comisiones?mode=year&year=${encodeURIComponent(yearValue)}`);
  };

  const handleMonthChange = (value: string) => {
    const yearValue = String(selectedYear || currentYear);
    router.push(
      `/admin/comisiones?mode=month&year=${encodeURIComponent(
        yearValue
      )}&month=${encodeURIComponent(value)}`
    );
  };

  const handleYearChange = (value: string) => {
    if (mode === "month") {
      const monthValue = String(selectedMonth || currentMonth).padStart(2, "0");
      router.push(
        `/admin/comisiones?mode=month&year=${encodeURIComponent(
          value
        )}&month=${encodeURIComponent(monthValue)}`
      );
      return;
    }
    router.push(`/admin/comisiones?mode=year&year=${encodeURIComponent(value)}`);
  };

  const handleClear = () => {
    router.push(`/admin/comisiones?mode=year&year=${encodeURIComponent(currentYear)}`);
  };

  const handleApplyRange = () => {
    const params = new URLSearchParams();
    params.set("mode", "range");
    if (fromValue) params.set("from", fromValue);
    if (toValue) params.set("to", toValue);
    router.push(`/admin/comisiones?${params.toString()}`);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {(["range", "month", "year"] as FilterMode[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => handleModeChange(option)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]",
              mode === option
                ? "border-brand-500 bg-white text-brand-700"
                : "border-brand-200 text-brand-600 hover:border-brand-400"
            )}
          >
            {option === "range" ? "Rango" : option === "month" ? "Mes" : "Año"}
          </button>
        ))}
        <button
          type="button"
          onClick={handleClear}
          className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-700 hover:border-amber-300"
        >
          Limpiar selección
        </button>
      </div>

      {mode === "range" ? (
        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm md:grid-cols-[1fr_1fr_auto]">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
              Desde
            </label>
            <input
              type="date"
              value={fromValue}
              onChange={(event) => setFromValue(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
              Hasta
            </label>
            <input
              type="date"
              value={toValue}
              onChange={(event) => setToValue(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2"
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleApplyRange}
              className="inline-flex w-full items-center justify-center rounded-full bg-brand-950 px-5 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-brand-900"
            >
              Aplicar
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
          {mode === "month" ? (
            <Dropdown
              value={String(selectedMonth || currentMonth).padStart(2, "0")}
              options={monthOptions}
              active
              ariaLabel="Selecciona mes"
              onChange={handleMonthChange}
            />
          ) : null}
          <Dropdown
            value={String(selectedYear || currentYear)}
            options={yearOptions}
            active
            ariaLabel="Selecciona año"
            onChange={handleYearChange}
          />
        </div>
      )}
    </div>
  );
}
