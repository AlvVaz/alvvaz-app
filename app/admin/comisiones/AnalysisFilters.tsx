"use client";

import { useEffect, useMemo, useState } from "react";
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
  { value: "all", label: "Todos" },
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

  const handleMonthChange = (value: string) => {
    if (value === "all") {
      const yearValue = String(selectedYear || currentYear);
      router.push(`/admin/comisiones?mode=year&year=${encodeURIComponent(yearValue)}`);
      return;
    }
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
        <label className="sr-only" htmlFor="analysis-month">
          Mes
        </label>
        <select
          id="analysis-month"
          value={
            mode === "month"
              ? String(selectedMonth || currentMonth).padStart(2, "0")
              : "all"
          }
          onChange={(event) => handleMonthChange(event.target.value)}
          onFocus={() => {
            if (mode === "month") return;
            const monthValue = String(currentMonth).padStart(2, "0");
            const yearValue = String(selectedYear || currentYear);
            router.push(
              `/admin/comisiones?mode=month&year=${encodeURIComponent(
                yearValue
              )}&month=${encodeURIComponent(monthValue)}`
            );
          }}
          className={cn(
            "rounded-full border bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]",
            mode === "month"
              ? "border-brand-500 text-brand-700"
              : "border-brand-200 text-brand-600 hover:border-brand-400"
          )}
        >
          {monthOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="analysis-year">
          Año
        </label>
        <select
          id="analysis-year"
          value={String(selectedYear || currentYear)}
          onChange={(event) => handleYearChange(event.target.value)}
          onFocus={() => {
            if (mode === "month") return;
            const yearValue = String(selectedYear || currentYear);
            router.push(`/admin/comisiones?mode=year&year=${encodeURIComponent(yearValue)}`);
          }}
          className={cn(
            "rounded-full border bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]",
            mode === "month" || mode === "year"
              ? "border-brand-500 text-brand-700"
              : "border-brand-200 text-brand-600 hover:border-brand-400"
          )}
        >
          {yearOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

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
    </div>
  );
}
