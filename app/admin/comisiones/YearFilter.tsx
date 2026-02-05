"use client";

import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";

type YearFilterProps = {
  years: number[];
  currentYear: number;
  range: string;
  selectedYear: string;
};

export function YearFilter({ years, currentYear, range, selectedYear }: YearFilterProps) {
  const router = useRouter();

  const handleMonthClick = () => {
    if (range === "month") {
      router.push("/admin/comisiones");
      return;
    }
    router.push("/admin/comisiones?range=month");
  };

  const handleYearChange = (value: string) => {
    if (value === "all") {
      router.push("/admin/comisiones?range=year&year=all");
      return;
    }
    router.push(`/admin/comisiones?range=year&year=${encodeURIComponent(value)}`);
  };

  const yearValue =
    selectedYear ||
    (range === "year" ? String(currentYear) : range === "all" ? "all" : String(currentYear));

  return (
    <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
      <button
        type="button"
        onClick={handleMonthClick}
        className={cn(
          "rounded-full border px-3 py-1 transition-colors",
          range === "month"
            ? "border-brand-500 bg-white text-brand-700"
            : "border-brand-200 text-brand-600 hover:border-brand-400"
        )}
      >
        Este mes
      </button>

      <div className="relative">
        <select
          value={yearValue}
          onChange={(event) => handleYearChange(event.target.value)}
          className={cn(
            "rounded-full border bg-white px-3 py-1 pr-8 text-xs font-semibold uppercase tracking-[0.2em] text-brand-600",
            range === "year" || range === "all"
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
