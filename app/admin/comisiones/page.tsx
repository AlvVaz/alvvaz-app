import Link from "next/link";
import { redirect } from "next/navigation";

import { SectionHeading } from "@/components/section-heading";
import { buttonLinkStyles } from "@/components/ui/button";
import { getAdminFromCookies } from "@/lib/auth/admin";
import { getContracts, getTrips } from "@/lib/db";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type SearchParam = string | string[] | undefined;

type SearchParams = {
  range?: SearchParam;
  from?: SearchParam;
  to?: SearchParam;
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

function endOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function getRange(searchParams?: SearchParams) {
  const now = new Date();
  const range = coerceParam(searchParams?.range) || "month";

  if (range === "custom") {
    const fromRaw = coerceParam(searchParams?.from);
    const toRaw = coerceParam(searchParams?.to);
    const from = parseDate(fromRaw) ?? new Date(now.getFullYear(), now.getMonth(), 1);
    const to = parseDate(toRaw) ?? now;
    return {
      range,
      start: new Date(from.getFullYear(), from.getMonth(), from.getDate()),
      end: endOfDay(to),
      from: fromRaw,
      to: toRaw,
    };
  }

  if (range === "year") {
    const start = new Date(now.getFullYear(), 0, 1);
    const end = endOfDay(new Date(now.getFullYear(), 11, 31));
    return { range, start, end };
  }

  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  return { range: "month", start, end };
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

  const { range, start, end, from, to } = getRange(searchParams);

  const contracts = await getContracts();
  const trips = await getTrips();

  const filteredContracts = contracts.filter((contract) => {
    const date = parseDate(contract.reservationDate) ?? parseDate(contract.createdAt);
    return inRange(date, start, end);
  });

  const filteredTrips = trips.filter((trip) => {
    const date = parseDate(trip.departureDate) ?? parseDate(trip.createdAt);
    return inRange(date, start, end);
  });

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

  const totalRevenue = saleContracts.reduce(
    (sum, contract) => sum + parseMoney(contract.totalPrice),
    0
  );

  const saleContractItems = saleContracts
    .map((contract) => {
      const contractDate = contract.reservationDate ?? contract.createdAt;
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

    const contractDate = contract.reservationDate ?? contract.createdAt;
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

  const buckets = getMonthBuckets(start, end);
  const bucketMap = new Map<string, { sales: number; revenue: number }>();
  for (const bucket of buckets) {
    bucketMap.set(bucket.key, { sales: 0, revenue: 0 });
  }

  for (const contract of saleContracts) {
    const date = parseDate(contract.reservationDate) ?? parseDate(contract.createdAt);
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
        title="Comisiones"
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
          <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            <Link
              href="/admin/comisiones?range=month"
              className={cn(
                "rounded-full border px-3 py-1",
                range === "month"
                  ? "border-brand-500 bg-white text-brand-700"
                  : "border-brand-200 text-brand-600"
              )}
            >
              Este mes
            </Link>
            <Link
              href="/admin/comisiones?range=year"
              className={cn(
                "rounded-full border px-3 py-1",
                range === "year"
                  ? "border-brand-500 bg-white text-brand-700"
                  : "border-brand-200 text-brand-600"
              )}
            >
              Este año
            </Link>
          </div>
        </div>

        <form
          method="get"
          action="/admin/comisiones"
          className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm md:grid-cols-[1fr_1fr_auto]"
        >
          <input type="hidden" name="range" value="custom" />
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
              Desde
            </label>
            <input
              type="date"
              name="from"
              defaultValue={from ?? ""}
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
              defaultValue={to ?? ""}
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

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            Ventas (firmadas + pagadas)
          </p>
          <p className="mt-3 font-display text-3xl text-brand-950">{saleContracts.length}</p>
          <p className="mt-1 text-sm text-slate-500">Contratos en el periodo</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            Ingresos estimados
          </p>
          <p className="mt-3 font-display text-3xl text-brand-950">
            {formatCurrency(totalRevenue)}
          </p>
          <p className="mt-1 text-sm text-slate-500">Basado en totalPrice</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            Viajes programados
          </p>
          <p className="mt-3 font-display text-3xl text-brand-950">
            {filteredTrips.length}
          </p>
          <p className="mt-1 text-sm text-slate-500">Salidas registradas</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            Firmados
          </p>
          <p className="mt-3 font-display text-3xl text-brand-950">
            {signedContracts.length}
          </p>
          <p className="mt-1 text-sm text-slate-500">En revisión o confirmados</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            Pagados
          </p>
          <p className="mt-3 font-display text-3xl text-brand-950">
            {paidContracts.length}
          </p>
          <p className="mt-1 text-sm text-slate-500">Ventas cobradas</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            Pendientes
          </p>
          <p className="mt-3 font-display text-3xl text-brand-950">
            {pendingContracts.length}
          </p>
          <p className="mt-1 text-sm text-slate-500">Por firmar o pagar</p>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-lg text-brand-950">
              Ventas firmadas o pagadas
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Contratos con estatus firmado o pagado.
            </p>
          </div>
          <span className="rounded-full border border-emerald-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
            {saleContractItems.length} contratos
          </span>
        </div>

        {saleContractItems.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/60 p-4 text-sm text-slate-600">
            No hay contratos firmados o pagados en este periodo.
          </div>
        ) : (
          <div className="mt-4 grid gap-3">
            {saleContractItems.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-semibold text-brand-950">{item.title}</p>
                  <p className="text-xs text-slate-500">
                    {item.clientName}
                    {item.contractNumber ? ` • #${item.contractNumber}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
                    {item.statusLabel}
                  </p>
                  <p className="text-sm text-brand-950">
                    {item.totalPrice ? formatCurrency(parseMoney(item.totalPrice)) : "—"}
                  </p>
                  <p className="text-xs text-slate-500">{item.dateLabel}</p>
                </div>
              </div>
            ))}
          </div>
        )}
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
          <h3 className="font-display text-lg text-brand-950">Ingresos por mes</h3>
          <p className="mt-1 text-sm text-slate-500">TotalPrice acumulado.</p>
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

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-lg text-brand-950">Ventas por asesor</h3>
            <p className="mt-1 text-sm text-slate-500">
              Contratos agrupados por quien organizó/vendió.
            </p>
          </div>
          <span className="rounded-full border border-brand-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            {sellerList.length} asesores
          </span>
        </div>

        {sellerList.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-brand-200 bg-white/60 p-6 text-sm text-slate-600">
            No hay ventas firmadas o pagadas en este periodo.
          </div>
        ) : (
          <div className="grid gap-4">
            {sellerList.map((seller) => (
              <details
                key={seller.name}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  <div className="grid items-center gap-4 md:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_0.8fr]">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                        Asesor
                      </p>
                      <p className="font-display text-lg text-brand-950">{seller.name}</p>
                      <p className="text-xs text-slate-500">
                        Última venta: {formatDateLabel(seller.lastSaleAt)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                        Contratos
                      </p>
                      <p className="text-sm text-brand-950">{seller.contracts}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                        Ingresos
                      </p>
                      <p className="text-sm text-brand-950">
                        {formatCurrency(seller.revenue)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                        Firmados
                      </p>
                      <p className="text-sm text-brand-950">{seller.signed}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                        Pagados
                      </p>
                      <p className="text-sm text-brand-950">{seller.paid}</p>
                    </div>
                  </div>
                </summary>

                <div className="mt-4 border-t border-slate-200 pt-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                    Contratos vendidos
                  </p>
                  <div className="mt-3 grid gap-3">
                    {seller.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm"
                      >
                        <div>
                          <p className="font-semibold text-brand-950">{item.title}</p>
                          <p className="text-xs text-slate-500">
                            {item.clientName}
                            {item.contractNumber ? ` • #${item.contractNumber}` : ""}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs uppercase tracking-[0.2em] text-brand-600">
                            {item.status}
                          </p>
                          <p className="text-sm text-brand-950">
                            {item.totalPrice ? formatCurrency(parseMoney(item.totalPrice)) : "—"}
                          </p>
                          <p className="text-xs text-slate-500">{item.dateLabel}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </details>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
