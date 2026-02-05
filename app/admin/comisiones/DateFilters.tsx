"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";

type DateFiltersProps = {
  years: number[];
  currentYear: number;
  currentMonth: number;
  range: string;
  selectedYear: string;
  selectedMonth: string;
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

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (wrapperRef.current.contains(event.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
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
                onClick={() => {
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

export function DateFilters({
  years,
  currentYear,
  currentMonth,
  range,
  selectedYear,
  selectedMonth,
}: DateFiltersProps) {
  const router = useRouter();

  const yearValue = selectedYear || String(currentYear);
  const monthValue =
    selectedMonth ||
    (range === "month" ? String(currentMonth).padStart(2, "0") : "all");

  const monthActive = monthValue !== "all";
  const yearActive = yearValue !== "all";

  const handleYearChange = (value: string) => {
    const resolvedValue = value === yearValue ? "all" : value;
    if (resolvedValue === "all") {
      router.push("/admin/comisiones?range=year&year=all");
      return;
    }

    if (monthValue !== "all") {
      router.push(
        `/admin/comisiones?range=month&year=${encodeURIComponent(
          resolvedValue
        )}&month=${encodeURIComponent(monthValue)}`
      );
      return;
    }

    router.push(`/admin/comisiones?range=year&year=${encodeURIComponent(resolvedValue)}`);
  };

  const handleMonthChange = (value: string) => {
    const resolvedValue = value === monthValue ? "all" : value;
    if (resolvedValue === "all") {
      if (yearValue === "all") {
        router.push("/admin/comisiones?range=year&year=all");
      } else {
        router.push(`/admin/comisiones?range=year&year=${encodeURIComponent(yearValue)}`);
      }
      return;
    }

    const resolvedYear = yearValue === "all" ? String(currentYear) : yearValue;
    router.push(
      `/admin/comisiones?range=month&year=${encodeURIComponent(
        resolvedYear
      )}&month=${encodeURIComponent(resolvedValue)}`
    );
  };

  const yearOptions: Option[] = [
    { value: "all", label: "Todos" },
    ...years.map((year) => ({ value: String(year), label: String(year) })),
  ];

  const monthDropdownOptions: Option[] = [{ value: "all", label: "Todos" }, ...monthOptions];

  return (
    <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
      <Dropdown
        value={monthValue}
        options={monthDropdownOptions}
        active={monthActive}
        ariaLabel="Filtrar por mes"
        onChange={handleMonthChange}
      />
      <Dropdown
        value={yearValue === "all" ? "all" : yearValue}
        options={yearOptions}
        active={yearActive}
        ariaLabel="Filtrar por año"
        onChange={handleYearChange}
      />
    </div>
  );
}
