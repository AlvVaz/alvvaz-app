import { redirect } from "next/navigation";

import { SectionHeading } from "@/components/section-heading";
import { getAdminFromCookies } from "@/lib/auth/admin";
import { getContracts, getTrips } from "@/lib/db";
export const dynamic = "force-dynamic";

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

export default async function ComisionesPage() {
  const admin = await getAdminFromCookies();
  if (!admin) {
    redirect("/admin/login");
  }
  if (admin.role === "admin") {
    redirect("/admin/contratos");
  }

  const contracts = await getContracts();
  const trips = await getTrips();

  const filteredContracts = contracts;
  const filteredTrips = trips;

  const saleContracts = contracts.filter(
    (contract) =>
      contract.status === "signed" ||
      contract.status === "paid" ||
      contract.isSigned ||
      contract.isPaid
  );
  const pendingContracts = contracts.filter(
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

  let bucketStart: Date;
  let bucketEnd: Date;
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

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            Ventas (firmadas + pagadas)
          </p>
          <p className="mt-3 font-display text-3xl text-brand-950">
            {saleContracts.length}
          </p>
          <p className="mt-1 text-sm text-slate-500">Contratos en el periodo</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            Ingresos netos
          </p>
          <p className="mt-3 font-display text-3xl text-brand-950">
            {formatCurrency(totalRevenue)}
          </p>
          <p className="mt-1 text-sm text-slate-500">Basado en Precio Neto</p>
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
            Pendientes
          </p>
          <p className="mt-3 font-display text-3xl text-brand-950">
            {pendingContracts.length}
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
