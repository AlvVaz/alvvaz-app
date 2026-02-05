import { redirect } from "next/navigation";

import { SectionHeading } from "@/components/section-heading";
import { buttonLinkStyles } from "@/components/ui/button";
import { getAdminFromCookies } from "@/lib/auth/admin";
import { getContracts, getTrips } from "@/lib/db";
import { DateFilters } from "./DateFilters";

export const dynamic = "force-dynamic";

type SearchParam = string | string[] | undefined;

type SearchParams = {
  range?: SearchParam;
  from?: SearchParam;
  to?: SearchParam;
  year?: SearchParam;
  month?: SearchParam;
};

type SellerSummary = {
  name: string;
  contracts: number;
  revenue: number;
  signed: number;
  paid: number;
  lastSaleAt?: string;
  items: Array<{
    id: string;
    title: string;
    clientName: string;
    contractNumber?: string | null;
    status: string;
    totalPrice?: string | null;
    dateLabel: string;
    dateValue: number;
  }>;
};

function coerceParam(value?: SearchParam): string {
  if (!value) return "";
  return Array.isArray(value) ? value[0] ?? "" : value;
}

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const ymdMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymdMatch) {
    const year = Number(ymdMatch[1]);
    const month = Number(ymdMatch[2]) - 1;
    const day = Number(ymdMatch[3]);
    const date = new Date(year, month, day);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const slashMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (slashMatch) {
    const first = Number(slashMatch[1]);
    const second = Number(slashMatch[2]);
    const year = Number(slashMatch[3]);
    const isDayFirst = first > 12 || second <= 12;
    const day = isDayFirst ? first : second;
    const month = isDayFirst ? second - 1 : first - 1;
    const date = new Date(year, month, day);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateInput(value?: string | null) {
  const date = parseDate(value);
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function endOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function getRange(searchParams?: SearchParams) {
  const now = new Date();
  const range = coerceParam(searchParams?.range);
  const yearParam = coerceParam(searchParams?.year);
  const monthParam = coerceParam(searchParams?.month);

  if (range === "custom") {
    const fromRaw = coerceParam(searchParams?.from);
    const toRaw = coerceParam(searchParams?.to);
    const parsedYear = Number.parseInt(yearParam || "", 10);
    const parsedMonth = Number.parseInt(monthParam || "", 10);
    const hasYear = Number.isFinite(parsedYear);
    const hasMonth = Number.isFinite(parsedMonth);
    const fallbackStart = hasYear && hasMonth
      ? new Date(parsedYear, parsedMonth - 1, 1)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const fallbackEnd = hasYear && hasMonth
      ? endOfDay(new Date(parsedYear, parsedMonth, 0))
      : now;
    const from = parseDate(fromRaw) ?? fallbackStart;
    const to = parseDate(toRaw) ?? fallbackEnd;
    return {
      range,
      hasFilter: true,
      start: new Date(from.getFullYear(), from.getMonth(), from.getDate()),
      end: endOfDay(to),
      from: fromRaw,
      to: toRaw,
      year: hasYear ? String(parsedYear) : yearParam || "",
      month: hasMonth ? String(parsedMonth).padStart(2, "0") : monthParam || "",
    };
  }

  if (range === "year") {
    if (yearParam === "all") {
      return { range: "all", hasFilter: false, start: null, end: null, year: "all" };
    }
    const parsedYear = Number.parseInt(yearParam || "", 10);
    const targetYear = Number.isFinite(parsedYear) ? parsedYear : now.getFullYear();
    const start = new Date(now.getFullYear(), 0, 1);
    const end = endOfDay(new Date(now.getFullYear(), 11, 31));
    start.setFullYear(targetYear, 0, 1);
    end.setFullYear(targetYear, 11, 31);
    return { range, hasFilter: true, start, end, year: String(targetYear) };
  }

  if (range === "month") {
    const parsedYear = Number.parseInt(yearParam || "", 10);
    const parsedMonth = Number.parseInt(monthParam || "", 10);
    const targetYear = Number.isFinite(parsedYear) ? parsedYear : now.getFullYear();
    const targetMonth = Number.isFinite(parsedMonth) ? parsedMonth : now.getMonth() + 1;
    const start = new Date(targetYear, targetMonth - 1, 1);
    const end = endOfDay(new Date(targetYear, targetMonth, 0));
    return {
      range,
      hasFilter: true,
      start,
      end,
      year: String(targetYear),
      month: String(targetMonth).padStart(2, "0"),
    };
  }

  const start = new Date(now.getFullYear(), 0, 1);
  const end = endOfDay(new Date(now.getFullYear(), 11, 31));
  return {
    range: "year",
    hasFilter: true,
    start,
    end,
    from: "",
    to: "",
    year: String(now.getFullYear()),
    month: "",
  };
}

function inRange(date: Date | null, start: Date, end: Date) {
  if (!date) return false;
  return date.getTime() >= start.getTime() && date.getTime() <= end.getTime();
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

function formatDateLabel(value?: string | null) {
  const date = parseDate(value);
  if (!date) return "Sin fecha";
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
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

export default async function ComisionesPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const admin = await getAdminFromCookies();
  if (!admin) {
    redirect("/admin/login");
  }
  if (admin.role === "admin") {
    redirect("/admin/contratos");
  }

  const { range, start, end, from, to, hasFilter, year, month } = getRange(searchParams);
  const selectedYearValue = year ?? "";
  const selectedMonthValue = month ?? "";
  let fromInput = formatDateInput(from);
  let toInput = formatDateInput(to);
  if (!fromInput && start) {
    fromInput = formatDateInput(start.toISOString());
  }
  if (!toInput && end) {
    toInput = formatDateInput(end.toISOString());
  }
  const now = new Date();

  const contracts = await getContracts();
  const trips = await getTrips();

  const yearsSet = new Set<number>();
  yearsSet.add(now.getFullYear());
  for (const contract of contracts) {
    const date = parseDate(contract.reservationDate);
    if (date) yearsSet.add(date.getFullYear());
  }
  const years = Array.from(yearsSet).sort((a, b) => b - a);

  const filteredContracts =
    hasFilter && start && end
      ? contracts.filter((contract) => {
          const date = parseDate(contract.reservationDate);
          return inRange(date, start, end);
        })
      : contracts;

  const filteredTrips =
    hasFilter && start && end
      ? trips.filter((trip) => {
          const date = parseDate(trip.departureDate) ?? parseDate(trip.createdAt);
          return inRange(date, start, end);
        })
      : trips;

  const signedContracts = filteredContracts.filter(
    (contract) => contract.status === "signed" || contract.isSigned
  );
  const paidContracts = filteredContracts.filter(
    (contract) => contract.status === "paid" || contract.isPaid
  );
  const saleContracts = filteredContracts.filter(
    (contract) =>
      contract.status === "signed" ||
      contract.status === "paid" ||
      contract.isSigned ||
      contract.isPaid
  );
  const pendingContracts = filteredContracts.filter(
    (contract) =>
      !(
        contract.status === "signed" ||
        contract.status === "paid" ||
        contract.isSigned ||
        contract.isPaid
      )
  );
  const noData = hasFilter && filteredContracts.length === 0 && filteredTrips.length === 0;

  const totalRevenue = saleContracts.reduce(
    (sum, contract) => sum + parseMoney(contract.totalPrice),
    0
  );

  const saleContractItems = saleContracts
    .map((contract) => {
      const contractDate = contract.reservationDate;
      const dateLabel = formatDateLabel(contractDate);
      const dateValue = parseDate(contractDate)?.getTime() ?? 0;
      const statusLabel =
        contract.status === "paid" || contract.isPaid ? "Pagado" : "Firmado";
      return {
        id: contract.id,
        title: contract.title,
        clientName: contract.clientName,
        contractNumber: contract.contractNumber,
        totalPrice: contract.totalPrice,
        statusLabel,
        dateLabel,
        dateValue,
      };
    })
    .sort((a, b) => b.dateValue - a.dateValue);

  const sellers = new Map<string, SellerSummary>();
  for (const contract of saleContracts) {
    const sellerName = contract.organizer?.trim() || "Sin asignar";
    const current = sellers.get(sellerName) ?? {
      name: sellerName,
      contracts: 0,
      revenue: 0,
      signed: 0,
      paid: 0,
      items: [],
    };

    current.contracts += 1;
    current.revenue += parseMoney(contract.totalPrice);
    if (contract.status === "paid" || contract.isPaid) current.paid += 1;
    if (contract.status === "signed" || contract.isSigned) current.signed += 1;

    const contractDate = contract.reservationDate;
    const dateLabel = formatDateLabel(contractDate);
    const dateValue = parseDate(contractDate)?.getTime() ?? 0;
    current.items.push({
      id: contract.id,
      title: contract.title,
      clientName: contract.clientName,
      contractNumber: contract.contractNumber,
      status: contract.status,
      totalPrice: contract.totalPrice,
      dateLabel,
      dateValue,
    });

    if (contractDate) {
      const dateObject = parseDate(contractDate);
      if (dateObject) {
        if (!current.lastSaleAt || dateObject > new Date(current.lastSaleAt)) {
          current.lastSaleAt = dateObject.toISOString();
        }
      }
    }

    sellers.set(sellerName, current);
  }

  const sellerList = Array.from(sellers.values()).sort((a, b) => b.revenue - a.revenue);
  for (const seller of sellerList) {
    seller.items.sort((a, b) => b.dateValue - a.dateValue);
  }

  let bucketStart = start;
  let bucketEnd = end;
  if (!bucketStart || !bucketEnd) {
    const saleDates = saleContracts
      .map((contract) => parseDate(contract.reservationDate))
      .filter((date): date is Date => Boolean(date));
    if (saleDates.length) {
      const minTime = Math.min(...saleDates.map((date) => date.getTime()));
      const maxTime = Math.max(...saleDates.map((date) => date.getTime()));
      const minDate = new Date(minTime);
      const maxDate = new Date(maxTime);
      bucketStart = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
      bucketEnd = endOfDay(new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 0));
    } else {
      const now = new Date();
      bucketStart = new Date(now.getFullYear(), now.getMonth(), 1);
      bucketEnd = endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    }
  }

  const buckets = getMonthBuckets(bucketStart, bucketEnd);
  const bucketMap = new Map<string, { sales: number; revenue: number }>();
  for (const bucket of buckets) {
    bucketMap.set(bucket.key, { sales: 0, revenue: 0 });
  }

  for (const contract of saleContracts) {
    const date = parseDate(contract.reservationDate);
    if (!date) continue;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const bucket = bucketMap.get(key);
    if (!bucket) continue;
    bucket.sales += 1;
    bucket.revenue += parseMoney(contract.totalPrice);
  }

  const maxSales = Math.max(1, ...Array.from(bucketMap.values()).map((b) => b.sales));
  const maxRevenue = Math.max(1, ...Array.from(bucketMap.values()).map((b) => b.revenue));

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
          <DateFilters
            years={years}
            currentYear={now.getFullYear()}
            currentMonth={now.getMonth() + 1}
            range={range}
            selectedYear={year ?? ""}
            selectedMonth={month ?? ""}
          />
        </div>

        <form
          method="get"
          action="/admin/comisiones"
          className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm md:grid-cols-[1fr_1fr_auto]"
        >
          <input type="hidden" name="range" value="custom" />
          <input type="hidden" name="year" value={selectedYearValue} />
          <input type="hidden" name="month" value={selectedMonthValue} />
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
              Desde
            </label>
            <input
              type="date"
              name="from"
              defaultValue={fromInput}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
              Hasta
            </label>
            <input
              type="date"
              name="to"
              defaultValue={toInput}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className={buttonLinkStyles({ variant: "primary", className: "w-full" })}
            >
              Aplicar
            </button>
          </div>
        </form>
      </section>

      {noData ? (
        <div className="inline-flex w-fit rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
          No hay datos en este periodo
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            Ventas (firmadas + pagadas)
          </p>
          <p className="mt-3 font-display text-3xl text-brand-950">
            {noData ? "—" : saleContracts.length}
          </p>
          <p className="mt-1 text-sm text-slate-500">Contratos en el periodo</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            Ingresos netos
          </p>
          <p className="mt-3 font-display text-3xl text-brand-950">
            {noData ? "—" : formatCurrency(totalRevenue)}
          </p>
          <p className="mt-1 text-sm text-slate-500">Basado en Precio Neto</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            Viajes programados
          </p>
          <p className="mt-3 font-display text-3xl text-brand-950">
            {noData ? "—" : filteredTrips.length}
          </p>
          <p className="mt-1 text-sm text-slate-500">Salidas registradas</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            Pendientes
          </p>
          <p className="mt-3 font-display text-3xl text-brand-950">
            {noData ? "—" : pendingContracts.length}
          </p>
          <p className="mt-1 text-sm text-slate-500">Por firmar o pagar</p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="font-display text-lg text-brand-950">Ventas por mes</h3>
          <p className="mt-1 text-sm text-slate-500">Contratos firmados o pagados.</p>
          <div className="mt-6 flex items-end gap-3">
            {buckets.map((bucket) => {
              const data = bucketMap.get(bucket.key) ?? { sales: 0, revenue: 0 };
              const height = Math.round((data.sales / maxSales) * 100);
              return (
                <div key={bucket.key} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex h-28 w-full items-end">
                    <div
                      className="w-full rounded-full bg-brand-500/80"
                      style={{ height: `${height}%` }}
                    />
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                    {bucket.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="font-display text-lg text-brand-950">
            Ingresos Netos por Mes
          </h3>
          <p className="mt-1 text-sm text-slate-500">Precio Neto Acumulado.</p>
          <div className="mt-6 flex items-end gap-3">
            {buckets.map((bucket) => {
              const data = bucketMap.get(bucket.key) ?? { sales: 0, revenue: 0 };
              const height = Math.round((data.revenue / maxRevenue) * 100);
              return (
                <div key={bucket.key} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex h-28 w-full items-end">
                    <div
                      className="w-full rounded-full bg-gradient-to-t from-brand-400 to-brand-600"
                      style={{ height: `${height}%` }}
                    />
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                    {bucket.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

    </div>
  );
}
