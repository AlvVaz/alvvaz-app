"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { SectionHeading } from "@/components/section-heading";
import type { Contract, Trip } from "@/lib/db";

import { AnalysisFilters } from "./AnalysisFilters";

type FilterMode = "range" | "month" | "year";

type ReservationParts = { year: number; month: number; day: number };

function parseReservationParts(value?: string | null): ReservationParts | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const ymdMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymdMatch) {
    const year = Number(ymdMatch[1]);
    const month = Number(ymdMatch[2]);
    const day = Number(ymdMatch[3]);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
      return null;
    }
    return { year, month, day };
  }

  const slashMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (slashMatch) {
    const first = Number(slashMatch[1]);
    const second = Number(slashMatch[2]);
    const year = Number(slashMatch[3]);
    if (!Number.isFinite(year) || !Number.isFinite(first) || !Number.isFinite(second)) {
      return null;
    }

    let month = first;
    let day = second;

    if (first > 12 && second <= 12) {
      day = first;
      month = second;
    } else if (second > 12 && first <= 12) {
      month = first;
      day = second;
    } else {
      month = first;
      day = second;
    }

    if (month < 1 || month > 12 || day < 1 || day > 31) {
      const swappedMonth = second;
      const swappedDay = first;
      if (swappedMonth >= 1 && swappedMonth <= 12 && swappedDay >= 1 && swappedDay <= 31) {
        return { year, month: swappedMonth, day: swappedDay };
      }
      return null;
    }

    return { year, month, day };
  }

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  return { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() };
}

function toDateKey(parts: ReservationParts) {
  return parts.year * 10000 + parts.month * 100 + parts.day;
}

function endOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function parseMoney(value?: string | null) {
  if (!value) return 0;
  const cleaned = value.replace(/[^0-9.,-]/g, "");
  if (!cleaned) return 0;
  const normalized = cleaned.replace(/,/g, "");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

function buildSparklinePoints(values: number[], maxValue: number) {
  const points = values.map((value, index) => {
    const x = values.length === 1 ? 50 : (index / (values.length - 1)) * 100;
    const y = 100 - (value / maxValue) * 100;
    return `${x},${y}`;
  });
  return points.join(" ");
}

function buildSparklineDots(values: number[], maxValue: number) {
  return values.map((value, index) => {
    const x = values.length === 1 ? 50 : (index / (values.length - 1)) * 100;
    const y = 100 - (value / maxValue) * 100;
    return { x, y, value };
  });
}

function getMonthBuckets(start: Date, end: Date, maxMonths = 12) {
  const buckets: Array<{ key: string; label: string; month: number; year: number }> = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);

  while (cursor <= last) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const key = `${year}-${String(month + 1).padStart(2, "0")}`;
    const label = new Intl.DateTimeFormat("es-MX", { month: "short" }).format(cursor);
    buckets.push({ key, label, month, year });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  if (buckets.length > maxMonths) {
    return buckets.slice(buckets.length - maxMonths);
  }

  return buckets;
}

function parseNumber(value?: string | null) {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function AnalysisDashboard({
  contracts,
  trips,
}: {
  contracts: Contract[];
  trips: Trip[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const rawMode = searchParams.get("mode");
  const rawYear = parseNumber(searchParams.get("year"));
  const rawMonth = parseNumber(searchParams.get("month"));
  const rangeFrom = searchParams.get("from") ?? "";
  const rangeTo = searchParams.get("to") ?? "";
  const hasRangeParams = Boolean(rangeFrom || rangeTo);

  const mode: FilterMode =
    rawMode === "range" || rawMode === "month" || rawMode === "year"
      ? rawMode
      : hasRangeParams
        ? "range"
        : rawMonth
          ? "month"
          : "year";

  const selectedYear = rawYear ?? currentYear;
  const selectedMonth = rawMonth ?? currentMonth;

  const years = useMemo(() => {
    const yearsSet = new Set<number>();
    yearsSet.add(currentYear);
    for (const contract of contracts) {
      const parts = parseReservationParts(contract.reservationDate);
      if (parts) yearsSet.add(parts.year);
    }
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [contracts, currentYear]);

  const computed = useMemo(() => {
    let rangeStartKey: number | null = null;
    let rangeEndKey: number | null = null;
    let bucketStartDate: Date | null = null;
    let bucketEndDate: Date | null = null;
    let hasFilter = true;

    if (mode === "range") {
      const fromParts = parseReservationParts(rangeFrom);
      const toParts = parseReservationParts(rangeTo);
      if (fromParts && toParts) {
        rangeStartKey = toDateKey(fromParts);
        rangeEndKey = toDateKey(toParts);
        bucketStartDate = new Date(fromParts.year, fromParts.month - 1, 1);
        bucketEndDate = endOfDay(new Date(toParts.year, toParts.month, 0));
      } else {
        hasFilter = false;
      }
    } else if (mode === "month") {
      bucketStartDate = new Date(selectedYear, selectedMonth - 1, 1);
      bucketEndDate = endOfDay(new Date(selectedYear, selectedMonth, 0));
    } else {
      bucketStartDate = new Date(selectedYear, 0, 1);
      bucketEndDate = endOfDay(new Date(selectedYear, 11, 31));
    }

    const filteredContracts = hasFilter
      ? contracts.filter((contract) => {
          const parts = parseReservationParts(contract.reservationDate);
          if (!parts) return false;
          if (mode === "month") {
            return parts.year === selectedYear && parts.month === selectedMonth;
          }
          if (mode === "year") {
            return parts.year === selectedYear;
          }
          if (rangeStartKey === null || rangeEndKey === null) return false;
          const key = toDateKey(parts);
          return key >= rangeStartKey && key <= rangeEndKey;
        })
      : [];

    const saleContracts = filteredContracts.filter(
      (contract) =>
        contract.status === "signed" ||
        contract.status === "paid" ||
        contract.isSigned ||
        contract.isPaid
    );

    const pendingContracts = filteredContracts.filter((contract) => {
      if (contract.status) {
        return contract.status === "pending";
      }
      return !(contract.isSigned || contract.isPaid);
    });

    const totalRevenue = saleContracts.reduce(
      (sum, contract) => sum + parseMoney(contract.totalPrice),
      0
    );

    const tripIdSet = new Set(trips.map((trip) => trip.id));
    const filteredTripIds = new Set(
      filteredContracts
        .map((contract) => contract.tripId)
        .filter(
          (tripId): tripId is string =>
            typeof tripId === "string" && tripIdSet.has(tripId)
        )
    );

    const tripsCount = filteredTripIds.size;
    const noData = hasFilter && filteredContracts.length === 0;
    const isRangeIncomplete =
      mode === "range" && (rangeStartKey === null || rangeEndKey === null);

    const bucketStart =
      bucketStartDate ?? new Date(currentYear, currentMonth - 1, 1);
    const bucketEnd =
      bucketEndDate ?? endOfDay(new Date(currentYear, currentMonth, 0));

    const buckets = getMonthBuckets(bucketStart, bucketEnd);
    const bucketMap = new Map<string, { sales: number; revenue: number }>();
    for (const bucket of buckets) {
      bucketMap.set(bucket.key, { sales: 0, revenue: 0 });
    }

    for (const contract of saleContracts) {
      const parts = parseReservationParts(contract.reservationDate);
      if (!parts) continue;
      const key = `${parts.year}-${String(parts.month).padStart(2, "0")}`;
      const bucket = bucketMap.get(key);
      if (!bucket) continue;
      bucket.sales += 1;
      bucket.revenue += parseMoney(contract.totalPrice);
    }

    const maxSales = Math.max(1, ...Array.from(bucketMap.values()).map((b) => b.sales));
    const maxRevenue = Math.max(1, ...Array.from(bucketMap.values()).map((b) => b.revenue));

    return {
      saleContracts,
      pendingContracts,
      totalRevenue,
      tripsCount,
      noData,
      isRangeIncomplete,
      buckets,
      bucketMap,
      maxSales,
      maxRevenue,
    };
  }, [
    contracts,
    trips,
    mode,
    rangeFrom,
    rangeTo,
    selectedYear,
    selectedMonth,
    currentYear,
    currentMonth,
  ]);

  const showEmptyState = computed.noData || computed.isRangeIncomplete;
  const salesSeries = computed.buckets.map(
    (bucket) => computed.bucketMap.get(bucket.key)?.sales ?? 0
  );
  const revenueSeries = computed.buckets.map(
    (bucket) => computed.bucketMap.get(bucket.key)?.revenue ?? 0
  );
  const salesLine = buildSparklinePoints(salesSeries, computed.maxSales);
  const revenueLine = buildSparklinePoints(revenueSeries, computed.maxRevenue);
  const salesDots = buildSparklineDots(salesSeries, computed.maxSales);
  const revenueDots = buildSparklineDots(revenueSeries, computed.maxRevenue);
  const isSingleMonth = computed.buckets.length === 1;

  return (
    <div className="space-y-8">
      <SectionHeading
        title="Analisis"
        subtitle="Resumen de ventas, contratos y rendimiento por asesor."
        kicker="Admin"
      />

      <section className="rounded-3xl border border-brand-200/80 bg-gradient-to-br from-brand-100 via-white to-brand-200/70 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-display text-lg text-brand-950">Filtros de fecha</h3>
            <p className="mt-1 text-sm text-slate-600">
              Ajusta el periodo para ver ventas y rendimiento.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              router.push(
                `/admin/comisiones?mode=year&year=${encodeURIComponent(currentYear)}`
              )
            }
            className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700 hover:border-brand-300"
          >
            Limpiar selección
          </button>
        </div>
        <AnalysisFilters
          mode={mode}
          years={years}
          currentYear={currentYear}
          currentMonth={currentMonth}
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          rangeFrom={rangeFrom}
          rangeTo={rangeTo}
        />
      </section>

      {showEmptyState ? (
        <div className="inline-flex w-fit rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
          {computed.isRangeIncomplete
            ? "Selecciona un rango y presiona aplicar"
            : "No se encontró data"}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            Ventas (firmadas + pagadas)
          </p>
          <p className="mt-3 font-display text-3xl text-brand-950">
            {showEmptyState ? "—" : computed.saleContracts.length}
          </p>
          <p className="mt-1 text-sm text-slate-500">Contratos en el periodo</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            Ingresos netos
          </p>
          <p className="mt-3 font-display text-3xl text-brand-950">
            {showEmptyState ? "—" : formatCurrency(computed.totalRevenue)}
          </p>
          <p className="mt-1 text-sm text-slate-500">Basado en Precio Neto</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            Viajes programados
          </p>
          <p className="mt-3 font-display text-3xl text-brand-950">
            {showEmptyState ? "—" : computed.tripsCount}
          </p>
          <p className="mt-1 text-sm text-slate-500">Salidas registradas</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            Pendientes
          </p>
          <p className="mt-3 font-display text-3xl text-brand-950">
            {showEmptyState ? "—" : computed.pendingContracts.length}
          </p>
          <p className="mt-1 text-sm text-slate-500">Por firmar o pagar</p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="font-display text-lg text-brand-950">Ventas por mes</h3>
          <p className="mt-1 text-sm text-slate-500">Contratos firmados o pagados.</p>
          <div className="mt-6">
            <div className="relative h-24">
              <svg viewBox="0 0 100 100" className="h-full w-full overflow-visible">
                <line x1="0" y1="98" x2="100" y2="98" stroke="#E2E8F0" strokeWidth="2" />
                <polyline
                  points={salesLine}
                  fill="none"
                  stroke="#3B82F6"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {salesDots.map((dot, index) => (
                  <circle
                    key={index}
                    cx={dot.x}
                    cy={dot.y}
                    r={isSingleMonth ? 5 : 3}
                    fill="#2563EB"
                    stroke="#ffffff"
                    strokeWidth={isSingleMonth ? 2 : 1.5}
                  />
                ))}
              </svg>
              {isSingleMonth ? (
                <span className="absolute right-0 top-0 text-[10px] uppercase tracking-[0.2em] text-slate-400">
                  Solo 1 mes
                </span>
              ) : null}
            </div>
            <div className="mt-3 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-slate-500">
              {computed.buckets.map((bucket) => (
                <span key={bucket.key}>{bucket.label}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="font-display text-lg text-brand-950">
            Ingresos Netos por Mes
          </h3>
          <p className="mt-1 text-sm text-slate-500">Precio Neto Acumulado.</p>
          <div className="mt-6">
            <div className="relative h-24">
              <svg viewBox="0 0 100 100" className="h-full w-full overflow-visible">
                <line x1="0" y1="98" x2="100" y2="98" stroke="#E2E8F0" strokeWidth="2" />
                <polyline
                  points={revenueLine}
                  fill="none"
                  stroke="#1D4ED8"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {revenueDots.map((dot, index) => (
                  <circle
                    key={index}
                    cx={dot.x}
                    cy={dot.y}
                    r={isSingleMonth ? 5 : 3}
                    fill="#1D4ED8"
                    stroke="#ffffff"
                    strokeWidth={isSingleMonth ? 2 : 1.5}
                  />
                ))}
              </svg>
              {isSingleMonth ? (
                <span className="absolute right-0 top-0 text-[10px] uppercase tracking-[0.2em] text-slate-400">
                  Solo 1 mes
                </span>
              ) : null}
            </div>
            <div className="mt-3 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-slate-500">
              {computed.buckets.map((bucket) => (
                <span key={bucket.key}>{bucket.label}</span>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
