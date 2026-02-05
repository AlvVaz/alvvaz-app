"use client";

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

const monthOptions = [
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

  const monthActive = range === "month" && monthValue !== "all";
  const yearActive = range === "year" || range === "month" || range === "all";

  const handleYearChange = (value: string) => {
    if (value === "all") {
      router.push("/admin/comisiones?range=year&year=all");
      return;
    }

    if (monthValue !== "all") {
      router.push(
        `/admin/comisiones?range=month&year=${encodeURIComponent(
          value
        )}&month=${encodeURIComponent(monthValue)}`
      );
      return;
    }

    router.push(`/admin/comisiones?range=year&year=${encodeURIComponent(value)}`);
  };

  const handleMonthChange = (value: string) => {
    if (value === "all") {
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
      )}&month=${encodeURIComponent(value)}`
    );
  };

  return (
    <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
      <div className="relative">
        <select
          value={monthValue}
          onChange={(event) => handleMonthChange(event.target.value)}
          className={cn(
            "rounded-full border bg-white px-3 py-1 pr-8 text-xs font-semibold uppercase tracking-[0.2em] text-brand-600",
            monthActive
              ? "border-brand-500 text-brand-700"
              : "border-brand-200 text-brand-600 hover:border-brand-400"
          )}
          aria-label="Filtrar por mes"
        >
          <option value="all">Todos</option>
          {monthOptions.map((month) => (
            <option key={month.value} value={month.value}>
              {month.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px]">
          ▼
        </span>
      </div>

      <div className="relative">
        <select
          value={yearValue === "all" ? "all" : yearValue}
          onChange={(event) => handleYearChange(event.target.value)}
          className={cn(
            "rounded-full border bg-white px-3 py-1 pr-8 text-xs font-semibold uppercase tracking-[0.2em] text-brand-600",
            yearActive
              ? "border-brand-500 text-brand-700"
              : "border-brand-200 text-brand-600 hover:border-brand-400"
          )}
          aria-label="Filtrar por año"
        >
          <option value="all">Todos</option>
          {years.map((year) => (
            <option key={year} value={String(year)}>
              {year}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px]">
          ▼
        </span>
      </div>
    </div>
  );
}
