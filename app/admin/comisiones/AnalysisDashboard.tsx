"use client";

import { useMemo, useState } from "react";
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

function getPreviousMonthParts(date: Date) {
  const monthIndex = date.getMonth();
  if (monthIndex === 0) {
    return { year: date.getFullYear() - 1, month: 12 };
  }
  return { year: date.getFullYear(), month: monthIndex };
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

function formatCurrencyDetailed(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
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

function normalizeOrganizerName(value?: string | null) {
  const cleaned = value?.trim();
  if (!cleaned) {
    return { key: "sin-asignar", label: "Sin asignar" };
  }
  const normalized = cleaned.toLowerCase();
  if (normalized === "miguel" || normalized === "miguel alvarado") {
    return { key: "miguel alvarado", label: "miguel alvarado" };
  }
  return { key: normalized, label: cleaned };
}

const shortDateFormatter = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
});

const monthOptions = [
  { value: 1, label: "Enero" },
  { value: 2, label: "Febrero" },
  { value: 3, label: "Marzo" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Mayo" },
  { value: 6, label: "Junio" },
  { value: 7, label: "Julio" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Septiembre" },
  { value: 10, label: "Octubre" },
  { value: 11, label: "Noviembre" },
  { value: 12, label: "Diciembre" },
];

const currentSellerOptions = [
  {
    key: "miguel-alvarado",
    label: "Miguel Alvarado",
    aliases: ["miguel", "miguel alvarado", "miguel alvardo"],
  },
  {
    key: "jessy-marquez",
    label: "Jessy Marquez",
    aliases: ["jessy", "jessy marquez"],
  },
  {
    key: "luis-gutierrez",
    label: "Luis Gutierrez",
    aliases: ["luis", "jose luis", "luis gutierrez", "luis gutierres"],
  },
];

function normalizeSellerAlias(value?: string | null) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function normalizeCurrentSeller(value?: string | null) {
  const alias = normalizeSellerAlias(value);
  if (!alias) return null;
  return (
    currentSellerOptions.find((seller) =>
      seller.aliases.some((sellerAlias) => normalizeSellerAlias(sellerAlias) === alias)
    ) ?? null
  );
}

function formatShortDate(value?: string | null) {
  if (!value) return "Sin fecha";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return shortDateFormatter.format(date);
}

function formatTripRange(departure?: string | null, returnDate?: string | null) {
  if (departure && returnDate) {
    return `${formatShortDate(departure)} → ${formatShortDate(returnDate)}`;
  }
  if (departure) {
    return `${formatShortDate(departure)} → Sin regreso`;
  }
  if (returnDate) {
    return `Salida sin fecha → ${formatShortDate(returnDate)}`;
  }
  return "Sin fechas";
}

export function AnalysisDashboard({
  contracts,
  trips,
  adminOptions,
}: {
  contracts: Contract[];
  trips: Trip[];
  adminOptions: Array<{ value: string; label: string }>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [today] = useState(() => {
    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const previousMonth = getPreviousMonthParts(date);
    return {
      year,
      month,
      dateKey: toDateKey({ year, month, day: date.getDate() }),
      defaultCompletedYear: previousMonth.year,
      defaultCompletedMonth: previousMonth.month,
    };
  });
  const currentYear = today.year;
  const currentMonth = today.month;
  const [completedMonth, setCompletedMonth] = useState(today.defaultCompletedMonth);
  const [completedYear, setCompletedYear] = useState(today.defaultCompletedYear);

  const rawMode = searchParams.get("mode");
  const rawYear = parseNumber(searchParams.get("year"));
  const rawMonth = parseNumber(searchParams.get("month"));
  const rangeFrom = searchParams.get("from") ?? "";
  const rangeTo = searchParams.get("to") ?? "";
  const rawAdmin = searchParams.get("admin") ?? "all";
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
  const allowedAdminKeys = useMemo(() => {
    const set = new Set<string>();
    adminOptions.forEach((option) => {
      if (!option.value) return;
      set.add(normalizeOrganizerName(option.value).key);
    });
    return set;
  }, [adminOptions]);

  const selectedAdminKey =
    rawAdmin && rawAdmin !== "all"
      ? normalizeOrganizerName(rawAdmin).key
      : "all";

  const effectiveAdminKey =
    selectedAdminKey !== "all" && !allowedAdminKeys.has(selectedAdminKey)
      ? "all"
      : selectedAdminKey;

  const yearsSet = new Set<number>();
  yearsSet.add(currentYear);
  for (const contract of contracts) {
    const parts = parseReservationParts(contract.reservationDate);
    if (parts) yearsSet.add(parts.year);
  }
  const years = Array.from(yearsSet).sort((a, b) => b - a);

  const completedYearsSet = new Set<number>();
  completedYearsSet.add(currentYear);
  completedYearsSet.add(today.defaultCompletedYear);
  for (const contract of contracts) {
    const parts = parseReservationParts(contract.returnDate);
    if (parts) completedYearsSet.add(parts.year);
  }
  const completedYears = Array.from(completedYearsSet).sort((a, b) => b - a);

  const adminFilterOptions = useMemo(() => {
    const map = new Map<string, string>();

    const addOption = (value?: string | null, labelOverride?: string) => {
      const normalized = normalizeOrganizerName(value);
      const key = normalized.key;
      if (!map.has(key)) {
        map.set(key, labelOverride ?? normalized.label);
      }
    };

    adminOptions?.forEach((option) => {
      if (!option.value) return;
      addOption(option.value, option.label);
    });

    const entries = Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .filter((option) => option.value !== "sin-asignar");

    entries.sort((a, b) => a.label.localeCompare(b.label, "es", { sensitivity: "base" }));

    return [
      { value: "all", label: "Todos" },
      ...entries,
    ];
  }, [adminOptions]);

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

    const adminFilteredContracts =
      effectiveAdminKey === "all"
        ? filteredContracts
        : filteredContracts.filter((contract) => {
            const organizerKey = normalizeOrganizerName(
              contract.seller || contract.organizer
            ).key;
            return organizerKey === effectiveAdminKey;
          });

    const saleContracts = adminFilteredContracts.filter(
      (contract) =>
        contract.status === "signed" ||
        contract.status === "paid" ||
        contract.isSigned ||
        contract.isPaid
    );

    const pendingContracts = adminFilteredContracts.filter((contract) => {
      if (contract.status) {
        return contract.status === "pending";
      }
      return !(contract.isSigned || contract.isPaid);
    });

    const organizerMap = new Map<
      string,
      {
        name: string;
        count: number;
        signedPaid: number;
        pending: number;
        total: number;
        contracts: Contract[];
      }
    >();

    for (const contract of adminFilteredContracts) {
      const organizer = normalizeOrganizerName(contract.seller || contract.organizer);
      const name = organizer.label;
      const key = organizer.key;
      const entry =
        organizerMap.get(key) ?? {
          name,
          count: 0,
          signedPaid: 0,
          pending: 0,
          total: 0,
          contracts: [],
        };
      entry.count += 1;
      if (contract.status === "signed" || contract.status === "paid" || contract.isSigned || contract.isPaid) {
        entry.signedPaid += 1;
      } else {
        entry.pending += 1;
      }
      entry.total += parseMoney(contract.totalPrice);
      entry.contracts.push(contract);
      organizerMap.set(key, entry);
    }

    const organizerSummary = Array.from(organizerMap.values()).sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.name.localeCompare(b.name, "es", { sensitivity: "base" });
    });

    const totalRevenue = saleContracts.reduce(
      (sum, contract) => sum + parseMoney(contract.totalPrice),
      0
    );

    const adminFilteredTrips =
      effectiveAdminKey === "all"
        ? trips
        : trips.filter(
            (trip) => normalizeOrganizerName(trip.organizer).key === effectiveAdminKey
          );
    const tripIdSet = new Set(adminFilteredTrips.map((trip) => trip.id));
    const filteredTripIds = new Set(
      adminFilteredContracts
        .map((contract) => contract.tripId)
        .filter(
          (tripId): tripId is string =>
            typeof tripId === "string" && tripIdSet.has(tripId)
        )
    );

    const tripsCount = filteredTripIds.size;
    const noData = hasFilter && adminFilteredContracts.length === 0;
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
      filteredContracts: adminFilteredContracts,
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
      organizerSummary,
    };
  }, [
    contracts,
    trips,
    mode,
    rangeFrom,
    rangeTo,
    selectedYear,
    selectedMonth,
    effectiveAdminKey,
    currentYear,
    currentMonth,
  ]);

  const showEmptyState = computed.noData || computed.isRangeIncomplete;
  const isSingleMonth = computed.buckets.length === 1;
  const completedBySeller = useMemo(() => {
    const sellers = new Map<
      string,
      {
        key: string;
        name: string;
        count: number;
        total: number;
        contracts: Contract[];
      }
    >();

    const ensureSeller = (seller: { key: string; label: string }) => {
      const existing = sellers.get(seller.key);
      if (existing) return existing;
      const entry = {
        key: seller.key,
        name: seller.label,
        count: 0,
        total: 0,
        contracts: [] as Contract[],
      };
      sellers.set(seller.key, entry);
      return entry;
    };

    for (const seller of currentSellerOptions) {
      ensureSeller(seller);
    }

    for (const contract of contracts) {
      const seller = normalizeCurrentSeller(contract.seller);
      if (!seller) continue;
      const returnParts = parseReservationParts(contract.returnDate);
      if (!returnParts) continue;
      if (returnParts.year !== completedYear || returnParts.month !== completedMonth) {
        continue;
      }
      if (toDateKey(returnParts) > today.dateKey) continue;
      const isCompletedSale =
        contract.status === "signed" ||
        contract.status === "paid" ||
        ((contract.isSigned || contract.isPaid) &&
          contract.status !== "pending" &&
          contract.status !== "canceled");
      if (!isCompletedSale) continue;

      const entry = ensureSeller(seller);
      entry.count += 1;
      entry.total += parseMoney(contract.totalPrice);
      entry.contracts.push(contract);
    }

    const groups = Array.from(sellers.values()).map((entry) => ({
      ...entry,
      contracts: [...entry.contracts].sort((a, b) => {
        const aParts = parseReservationParts(a.returnDate);
        const bParts = parseReservationParts(b.returnDate);
        const aKey = aParts ? toDateKey(aParts) : Number.POSITIVE_INFINITY;
        const bKey = bParts ? toDateKey(bParts) : Number.POSITIVE_INFINITY;
        if (aKey !== bKey) return aKey - bKey;
        return (a.contractNumber ?? a.id).localeCompare(
          b.contractNumber ?? b.id,
          "es",
          { sensitivity: "base" }
        );
      }),
    }));

    groups.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      if (b.total !== a.total) return b.total - a.total;
      return a.name.localeCompare(b.name, "es", { sensitivity: "base" });
    });

    const totalContracts = groups.reduce((sum, entry) => sum + entry.count, 0);
    const totalAmount = groups.reduce((sum, entry) => sum + entry.total, 0);
    const maxTotal = Math.max(1, ...groups.map((entry) => entry.total));

    return { groups, totalContracts, totalAmount, maxTotal };
  }, [contracts, completedMonth, completedYear, today.dateKey]);

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
              router.push(`/admin/comisiones?mode=year&year=${encodeURIComponent(currentYear)}`)
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
          selectedAdmin={effectiveAdminKey}
          adminOptions={adminFilterOptions}
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
            Ventas acumuladas grupales
          </p>
          <p className="mt-3 font-display text-3xl text-brand-950">
            {showEmptyState ? "—" : computed.saleContracts.length}
          </p>
          <p className="mt-1 text-sm text-slate-500">Contratos en el periodo</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            Ingresos acumulados neto
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
            <div className="flex h-28 items-end gap-2">
              {computed.buckets.map((bucket) => {
                const value = computed.bucketMap.get(bucket.key)?.sales ?? 0;
                const height = Math.max(4, Math.round((value / computed.maxSales) * 100));
                return (
                  <div key={bucket.key} className="flex flex-1 flex-col items-center gap-2">
                    <div className="group relative flex h-24 w-full items-end justify-center">
                      <div
                        className="w-2 rounded-full bg-brand-500/80"
                        style={{ height: `${height}%` }}
                      />
                      <span className="pointer-events-none absolute -top-7 whitespace-nowrap rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 opacity-0 shadow-sm transition group-hover:opacity-100">
                        {value} contratos
                      </span>
                    </div>
                    <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                      {bucket.label}
                    </span>
                  </div>
                );
              })}
            </div>
            {isSingleMonth ? (
              <span className="mt-2 block text-[10px] uppercase tracking-[0.2em] text-slate-400">
                Solo 1 mes
              </span>
            ) : null}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="font-display text-lg text-brand-950">
            Ventas Generadas Acumuladas por Mes (MXN)
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Suma del precio de contratos firmados o pagados según el mes de reserva.
          </p>
          <div className="mt-6">
            <div className="flex h-28 items-end gap-2">
              {computed.buckets.map((bucket) => {
                const value = computed.bucketMap.get(bucket.key)?.revenue ?? 0;
                const height = Math.max(4, Math.round((value / computed.maxRevenue) * 100));
                return (
                  <div key={bucket.key} className="flex flex-1 flex-col items-center gap-2">
                    <div className="group relative flex h-24 w-full items-end justify-center">
                      <div
                        className="w-2 rounded-full bg-gradient-to-t from-brand-400 to-brand-600"
                        style={{ height: `${height}%` }}
                      />
                      <span className="pointer-events-none absolute -top-7 whitespace-nowrap rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 opacity-0 shadow-sm transition group-hover:opacity-100">
                        {formatCurrency(value)}
                      </span>
                    </div>
                    <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                      {bucket.label}
                    </span>
                  </div>
                );
              })}
            </div>
            {isSingleMonth ? (
              <span className="mt-2 block text-[10px] uppercase tracking-[0.2em] text-slate-400">
                Solo 1 mes
              </span>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="font-display text-lg text-brand-950">
              Viajes Completados por Asesor (Comisiones)
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Contratos firmados o pagados con fecha de regreso en el mes seleccionado.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="completed-month">
              Mes completado
            </label>
            <select
              id="completed-month"
              value={String(completedMonth)}
              onChange={(event) => setCompletedMonth(Number(event.target.value))}
              className="rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-600 hover:border-brand-400"
            >
              {monthOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <label className="sr-only" htmlFor="completed-year">
              Año completado
            </label>
            <select
              id="completed-year"
              value={String(completedYear)}
              onChange={(event) => setCompletedYear(Number(event.target.value))}
              className="rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-600 hover:border-brand-400"
            >
              {completedYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
            {completedBySeller.totalContracts} contratos completados
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700">
            {formatCurrencyDetailed(completedBySeller.totalAmount)}
          </span>
        </div>

        <div className="mt-5 space-y-3">
          {completedBySeller.groups.map((entry) => {
            const width =
              entry.total > 0
                ? Math.max(8, Math.round((entry.total / completedBySeller.maxTotal) * 100))
                : 0;
            if (entry.contracts.length === 0) {
              return (
                <div
                  key={entry.key}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-brand-950">{entry.name}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-brand-600">
                        {entry.count} contratos completados
                      </p>
                    </div>
                    <span className="font-display text-lg font-semibold text-brand-600">
                      {formatCurrencyDetailed(entry.total)}
                    </span>
                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-brand-500"
                      style={{ width: `${width}%` }}
                    />
                  </div>

                  <span className="mt-3 block text-xs text-slate-400">
                    Sin contratos completados este mes.
                  </span>
                </div>
              );
            }

            return (
              <details
                key={entry.key}
                className="group rounded-2xl border border-slate-200 bg-white px-4 py-3"
              >
                <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-brand-950">{entry.name}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-brand-600">
                        {entry.count} contratos completados
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-lg font-semibold text-brand-600">
                        {formatCurrencyDetailed(entry.total)}
                      </span>
                      <span className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                        <span className="group-open:hidden">Ver contratos</span>
                        <span className="hidden group-open:inline">Ocultar contratos</span>
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-brand-500"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </summary>

                <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                  {entry.contracts.map((contract) => (
                    <span
                      key={contract.id}
                      className="max-w-full break-all rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700"
                    >
                      {contract.contractNumber ? `#${contract.contractNumber}` : contract.id}
                    </span>
                  ))}
                </div>
              </details>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-lg text-brand-950">
              Contratos por asesor
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Resumen según el filtro actual.
            </p>
          </div>
          <span className="rounded-full border border-brand-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
            {computed.filteredContracts.length} contratos
          </span>
        </div>

        {computed.organizerSummary.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-brand-200 bg-brand-50/40 p-4 text-sm text-slate-600">
            No hay contratos para este filtro.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {computed.organizerSummary.map((entry) => {
              const sortedContracts = [...entry.contracts].sort((a, b) => {
                const aParts = parseReservationParts(a.reservationDate);
                const bParts = parseReservationParts(b.reservationDate);
                const aKey = aParts ? toDateKey(aParts) : Number.POSITIVE_INFINITY;
                const bKey = bParts ? toDateKey(bParts) : Number.POSITIVE_INFINITY;
                return aKey - bKey;
              });

              return (
                <details
                  key={entry.name}
                  className="rounded-2xl border border-slate-200 bg-white"
                >
                  <summary className="cursor-pointer list-none px-4 py-3 [&::-webkit-details-marker]:hidden">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-brand-950">{entry.name}</p>
                        <p className="text-xs uppercase tracking-[0.2em] text-brand-600">
                          {entry.signedPaid} firmados/pagados · {entry.pending} pendientes
                        </p>
                      </div>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                        Acumulado: {formatCurrencyDetailed(entry.total)}
                      </span>
                      <span className="rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
                        {entry.count} contratos
                      </span>
                    </div>
                  </summary>
                  <div className="border-t border-slate-200 px-4 py-3">
                    <div className="grid gap-2 text-xs text-slate-600">
                      {sortedContracts.map((contract) => (
                        <div
                          key={contract.id}
                          className="grid gap-2 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2 md:grid-cols-[0.8fr_1.2fr_0.8fr_1fr_0.9fr]"
                        >
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-600">
                              Contrato
                            </p>
                            <p className="text-sm text-brand-950">
                              {contract.contractNumber ? `#${contract.contractNumber}` : "Sin folio"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-600">
                              Fechas de viaje
                            </p>
                            <p className="text-sm text-slate-700">
                              {formatTripRange(contract.departureDate, contract.returnDate)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-600">
                              Costo
                            </p>
                            <p className="text-sm text-slate-700">
                              {formatCurrency(parseMoney(contract.totalPrice))}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-600">
                              Proveedor
                            </p>
                            <p className="text-sm text-slate-700">
                              {contract.supplier || "Sin proveedor"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-600">
                              Fecha de reserva
                            </p>
                            <p className="text-sm text-slate-700">
                              {contract.reservationDate || "Sin fecha"}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
