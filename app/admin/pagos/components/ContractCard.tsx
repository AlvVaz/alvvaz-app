"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";

import { SectionHeading } from "@/components/section-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThemedSelect } from "@/components/ui/themed-select";
import { cn } from "@/lib/utils";
import type { ContractStatus, TripTraveler } from "@/lib/db";
import type { PaymentInstallment, PaymentPlan, RuntimeInstallmentStatus } from "@/lib/payment-plans";
import type { TransactionsByType } from "@/types/transactions";

import { PaymentPlanModal } from "./PaymentPlanModal";
import { TransactionPanel } from "./TransactionPanel";

type PaymentState = "sin_pagos" | "parcial" | "pagado";
type FilterState = "todos" | "parcial" | "pagado";
type AlertCategory = "overdue" | "tomorrow" | "upcoming";

export type PaymentContract = {
  id: string;
  contractNumber: string | null;
  clientName: string;
  destination: string;
  travelers: TripTraveler[];
  contactPhone: string | null;
  reservationDate: string | null;
  departureDate: string | null;
  liquidationDate: string | null;
  totalPrice: string | null;
  firstPayment: string | null;
  status: ContractStatus;
  transactions: TransactionsByType;
  paymentPlan: PaymentPlan | null;
};

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function getPaymentState(transactions: TransactionsByType): PaymentState {
  const customerPayments = transactions.customer_payment;
  if (customerPayments.length === 0) return "sin_pagos";
  return customerPayments.some((transaction) => transaction.status === "pendiente")
    ? "parcial"
    : "pagado";
}

function getStateBadgeClass(state: PaymentState) {
  if (state === "sin_pagos") return "border-slate-200 bg-slate-50 text-slate-600";
  return "border-blue-200 bg-blue-50 text-blue-700";
}

function getTransactionCount(transactions: TransactionsByType) {
  return transactions.customer_payment.length + transactions.wholesaler_payment.length;
}

function getTransactionCountLabel(count: number) {
  return count === 1 ? "1 transaccion" : `${count} transacciones`;
}

function getTodayDateOnly() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDaysDateOnly(dateOnly: string, days: number) {
  const date = new Date(`${dateOnly}T00:00:00`);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function diffDays(fromDateOnly: string, toDateOnly: string) {
  const from = new Date(`${fromDateOnly}T00:00:00`).getTime();
  const to = new Date(`${toDateOnly}T00:00:00`).getTime();
  if (!Number.isFinite(from) || !Number.isFinite(to)) return 0;
  return Math.floor((to - from) / 86_400_000);
}

function getInstallmentRuntimeStatus(
  installment: PaymentInstallment,
  today = getTodayDateOnly()
): RuntimeInstallmentStatus {
  if (installment.status === "pagado") return "pagado";
  return installment.dueDate < today ? "vencido" : "pendiente";
}

function getUpcomingInstallmentCount(plan: PaymentPlan | null, today = getTodayDateOnly()) {
  if (!plan) return 0;
  const todayDate = new Date(`${today}T00:00:00`);
  const soon = new Date(todayDate);
  soon.setDate(soon.getDate() + 7);
  return plan.installments.filter((installment) => {
    if (installment.status !== "pendiente") return false;
    const dueDate = new Date(`${installment.dueDate}T00:00:00`);
    return dueDate >= todayDate && dueDate <= soon;
  }).length;
}

function getOverdueInstallmentCount(plan: PaymentPlan | null, today = getTodayDateOnly()) {
  if (!plan) return 0;
  return plan.installments.filter(
    (installment) => installment.status === "pendiente" && installment.dueDate < today
  ).length;
}

function formatAmount(value: string | number) {
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(number);
}

function formatDate(value: string | null) {
  if (!value) return "Sin fecha";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function getInstallmentBadgeClass(status: RuntimeInstallmentStatus) {
  if (status === "pagado") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "vencido") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function buildWhatsAppUrl(phone: string | null, contract: PaymentContract) {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 10) digits = `52${digits}`;
  if (digits.length < 10) return null;

  const folio = contract.contractNumber ? `#${contract.contractNumber}` : "tu contrato";
  const message = `Hola ${contract.clientName}, te contactamos de AlvVaz sobre el pago pendiente del contrato ${folio}.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

type PaymentAlert = {
  key: string;
  category: AlertCategory;
  contract: PaymentContract;
  installment: PaymentInstallment;
  daysOverdue: number;
  whatsappUrl: string | null;
};

function buildPaymentAlerts(contracts: PaymentContract[], today = getTodayDateOnly()) {
  const tomorrow = addDaysDateOnly(today, 1);
  const soon = addDaysDateOnly(today, 7);
  const alerts: PaymentAlert[] = [];

  contracts.forEach((contract) => {
    contract.paymentPlan?.installments.forEach((installment) => {
      if (installment.status !== "pendiente") return;

      let category: AlertCategory | null = null;
      if (installment.dueDate < today) {
        category = "overdue";
      } else if (installment.dueDate === tomorrow) {
        category = "tomorrow";
      } else if (installment.dueDate <= soon) {
        category = "upcoming";
      }

      if (!category) return;
      alerts.push({
        key: `${contract.id}-${installment.id}`,
        category,
        contract,
        installment,
        daysOverdue: Math.max(diffDays(installment.dueDate, today), 0),
        whatsappUrl: buildWhatsAppUrl(contract.contactPhone, contract),
      });
    });
  });

  return alerts.sort((a, b) => {
    const byDate = a.installment.dueDate.localeCompare(b.installment.dueDate);
    if (byDate !== 0) return byDate;
    return (a.contract.contractNumber ?? "").localeCompare(b.contract.contractNumber ?? "");
  });
}

function getAlertStatusLabel(alert: PaymentAlert) {
  if (alert.category === "overdue") {
    return alert.daysOverdue > 7 ? "Vencida +7 dias" : "Vencida";
  }
  if (alert.category === "tomorrow") return "Vence mañana";
  return alert.installment.dueDate === getTodayDateOnly() ? "Vence hoy" : "Proxima";
}

function getAlertBadgeClass(category: AlertCategory) {
  if (category === "overdue") return "border-rose-200 bg-rose-50 text-rose-700";
  if (category === "tomorrow") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-blue-200 bg-blue-50 text-blue-700";
}

function PaymentAlertsModal({
  open,
  alerts,
  onClose,
}: {
  open: boolean;
  alerts: PaymentAlert[];
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  const grouped: Record<AlertCategory, PaymentAlert[]> = {
    overdue: alerts.filter((alert) => alert.category === "overdue"),
    tomorrow: alerts.filter((alert) => alert.category === "tomorrow"),
    upcoming: alerts.filter((alert) => alert.category === "upcoming"),
  };

  const sections: { key: AlertCategory; title: string; empty: string }[] = [
    { key: "tomorrow", title: "Vencen mañana", empty: "No hay cuotas para mañana." },
    { key: "overdue", title: "Vencidas", empty: "No hay cuotas vencidas." },
    { key: "upcoming", title: "Proximos 7 dias", empty: "No hay cuotas proximas." },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-950/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Alertas de pagos"
      onClick={onClose}
    >
      <div
        className="max-h-[calc(100vh-2rem)] w-full max-w-6xl overflow-y-auto overscroll-contain rounded-3xl border border-slate-200 bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
              Pagos
            </p>
            <h2 className="font-display text-2xl text-brand-950">Alertas</h2>
            <p className="mt-1 text-sm text-slate-600">
              Cuotas pendientes vencidas, para mañana y dentro de los próximos 7 días.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600 transition hover:border-brand-300 hover:text-brand-700"
            aria-label="Cerrar alertas"
          >
            ×
          </button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {sections.map((section) => (
            <div
              key={section.key}
              className={cn(
                "rounded-2xl border p-4",
                getAlertBadgeClass(section.key)
              )}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em]">
                {section.title}
              </p>
              <p className="mt-2 font-display text-3xl">{grouped[section.key].length}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 space-y-6">
          {sections.map((section) => (
            <section key={section.key} className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="font-display text-lg text-brand-950">{section.title}</h3>
                <Badge className={cn("rounded-lg", getAlertBadgeClass(section.key))}>
                  {grouped[section.key].length} cuota(s)
                </Badge>
              </div>

              {grouped[section.key].length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                  {section.empty}
                </div>
              ) : (
                <div className="grid gap-3">
                  {grouped[section.key].map((alert) => (
                    <article
                      key={alert.key}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_160px_150px_auto] lg:items-center">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/admin/contratos#contract-${alert.contract.id}`}
                              className="font-display text-lg text-brand-950 transition hover:text-brand-700"
                            >
                              {alert.contract.contractNumber
                                ? `#${alert.contract.contractNumber}`
                                : "Sin folio"}
                            </Link>
                            <Badge
                              className={cn(
                                "rounded-lg px-2 py-1 text-[10px]",
                                getAlertBadgeClass(alert.category)
                              )}
                            >
                              {getAlertStatusLabel(alert)}
                            </Badge>
                          </div>
                          <p className="mt-1 truncate text-sm font-semibold text-slate-800">
                            {alert.contract.clientName}
                          </p>
                          <p className="truncate text-sm text-slate-600">
                            {alert.contract.destination}
                          </p>
                          <p className="mt-1 truncate text-[11px] uppercase tracking-[0.12em] text-slate-400">
                            ID {alert.contract.id}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-600">
                            Cuota
                          </p>
                          <p className="mt-1 text-sm text-slate-700">
                            Pago #{alert.installment.installmentNumber}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-600">
                            Fecha
                          </p>
                          <p className="mt-1 text-sm text-slate-700">
                            {formatDate(alert.installment.dueDate)}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
                          <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-brand-950">
                            {formatAmount(alert.installment.amount)}
                          </span>
                          {alert.whatsappUrl ? (
                            <a
                              href={alert.whatsappUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-emerald-700 transition hover:border-emerald-300 hover:text-emerald-800"
                            >
                              WhatsApp
                            </a>
                          ) : (
                            <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
                              Sin WhatsApp
                            </span>
                          )}
                          <Link
                            href={`/admin/contratos#contract-${alert.contract.id}`}
                            className="rounded-lg border border-brand-200 px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-brand-700 transition hover:border-brand-300 hover:text-brand-900"
                          >
                            Contrato
                          </Link>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PaymentsContractsList({
  contracts,
  supplierOptions,
}: {
  contracts: PaymentContract[];
  supplierOptions: string[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterState>("todos");
  const [openContractId, setOpenContractId] = useState<string | null>(null);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [selectedPlanContractId, setSelectedPlanContractId] = useState<string | null>(null);
  const [planOverrides, setPlanOverrides] = useState<Record<string, PaymentPlan | null>>({});

  const contractsWithPlans = useMemo(
    () =>
      contracts.map((contract) => ({
        ...contract,
        paymentPlan:
          Object.prototype.hasOwnProperty.call(planOverrides, contract.id)
            ? planOverrides[contract.id]
            : contract.paymentPlan,
      })),
    [contracts, planOverrides]
  );

  const alerts = useMemo(() => buildPaymentAlerts(contractsWithPlans), [contractsWithPlans]);
  const alertCounts = useMemo(
    () => ({
      overdue: alerts.filter((alert) => alert.category === "overdue").length,
      tomorrow: alerts.filter((alert) => alert.category === "tomorrow").length,
      upcoming: alerts.filter((alert) => alert.category === "upcoming").length,
      total: alerts.length,
    }),
    [alerts]
  );

  const filteredContracts = useMemo(() => {
    const normalizedQuery = normalizeText(query.trim());

    return contractsWithPlans.filter((contract) => {
      const paymentState = getPaymentState(contract.transactions);
      const matchesStatus = statusFilter === "todos" || paymentState === statusFilter;
      const haystack = normalizeText(
        [
          contract.clientName,
          contract.destination,
          contract.contractNumber ?? "",
        ].join(" ")
      );
      return matchesStatus && (!normalizedQuery || haystack.includes(normalizedQuery));
    });
  }, [contractsWithPlans, query, statusFilter]);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <SectionHeading
          title="Pagos"
          subtitle="Registra cobros, pagos a mayoristas y comprobantes por contrato."
          kicker="Admin"
        />
        <Button
          type="button"
          variant="secondary"
          onClick={() => setAlertsOpen(true)}
          className={cn(
            "relative mt-1 rounded-lg border-2 px-6 py-4 text-sm shadow-sm hover:shadow-md",
            alertCounts.total > 0
              ? "border-amber-200 bg-amber-50 text-brand-950 hover:border-amber-300"
              : "border-brand-200 bg-white text-brand-950 hover:border-brand-300",
            alertCounts.overdue > 0 &&
              "border-rose-200 bg-rose-50 text-rose-800 hover:border-rose-300"
          )}
        >
          {alertCounts.total > 0 ? (
            <span
              className={cn(
                "absolute -right-1.5 -top-1.5 h-3.5 w-3.5 rounded-full ring-4 ring-white",
                alertCounts.overdue > 0 ? "bg-rose-500" : "bg-amber-400"
              )}
              aria-hidden="true"
            />
          ) : null}
          Alertas
          {alertCounts.total > 0 ? (
            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] shadow-sm">
              {alertCounts.total}
            </span>
          ) : null}
        </Button>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px_auto] md:items-end">
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
              Buscar
            </span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cliente, destino o folio"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </label>

          <div className="space-y-2">
            <span className="block text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
              Estado
            </span>
            <ThemedSelect
              value={statusFilter}
              onChange={(value) => setStatusFilter(value as FilterState)}
              options={[
                { value: "todos", label: "Todos" },
                { value: "parcial", label: "Parcial" },
                { value: "pagado", label: "Pagado" },
              ]}
            />
          </div>

          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setSelectedPlanContractId(null);
              setPlanModalOpen(true);
            }}
            className="rounded-lg px-3 py-3 text-xs"
          >
            Asignar plan de pagos
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {filteredContracts.length > 0 ? (
          filteredContracts.map((contract) => (
            <ContractCard
              key={contract.id}
              contract={contract}
              supplierOptions={supplierOptions}
              open={openContractId === contract.id}
              onToggle={() =>
                setOpenContractId((current) => (current === contract.id ? null : contract.id))
              }
              onEditPlan={() => {
                setSelectedPlanContractId(contract.id);
                setPlanModalOpen(true);
              }}
              onPlanChanged={(plan) => {
                setPlanOverrides((current) => ({ ...current, [contract.id]: plan }));
                router.refresh();
              }}
            />
          ))
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-8 text-center text-sm text-slate-600">
            No hay contratos que coincidan con los filtros.
          </div>
        )}
      </div>

      <PaymentPlanModal
        open={planModalOpen}
        contracts={contractsWithPlans}
        initialContractId={selectedPlanContractId}
        onClose={() => setPlanModalOpen(false)}
        onSaved={(contractId, plan) => {
          setPlanOverrides((current) => ({ ...current, [contractId]: plan }));
          router.refresh();
        }}
      />
      <PaymentAlertsModal
        open={alertsOpen}
        alerts={alerts}
        onClose={() => setAlertsOpen(false)}
      />
    </section>
  );
}

function PaymentInstallmentsGrid({
  contractId,
  paymentPlan,
  onEditPlan,
  onChanged,
}: {
  contractId: string;
  paymentPlan: PaymentPlan | null;
  onEditPlan: () => void;
  onChanged: () => Promise<void>;
}) {
  const [deletingPlan, setDeletingPlan] = useState(false);
  const toast = useToast();

  const handleDeletePlan = async () => {
    if (!paymentPlan) return;
    const confirmed = window.confirm(
      "¿Eliminar este plan de pagos? Las cuotas programadas se eliminarán, pero las transacciones registradas se conservarán."
    );
    if (!confirmed) return;

    setDeletingPlan(true);
    try {
      const response = await fetch(`/api/contracts/${contractId}/payment-plan`, {
        method: "DELETE",
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "No se pudo eliminar el plan de pagos.");
      }
      toast.push("Plan de pagos eliminado.", "success");
      await onChanged();
    } catch (error) {
      toast.push((error as Error).message, "error");
    } finally {
      setDeletingPlan(false);
    }
  };

  return (
    <section className="mt-6 border-t border-slate-200 pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 pb-3">
        <div>
          <h3 className="font-display text-base text-brand-950">Plan de pagos</h3>
          {paymentPlan ? (
            <p className="mt-1 text-xs text-slate-500">
              {paymentPlan.frequency} · {paymentPlan.installmentCount} pago(s) · Balance{" "}
              {formatAmount(Number(paymentPlan.totalAmount) - Number(paymentPlan.depositAmount))}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {paymentPlan ? (
            <Button
              type="button"
              variant="secondary"
              onClick={handleDeletePlan}
              disabled={deletingPlan}
              className="rounded-lg border-rose-200 px-3 py-2 text-xs text-rose-700 hover:border-rose-300 hover:text-rose-800"
            >
              {deletingPlan ? "Eliminando..." : "Eliminar plan"}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            onClick={onEditPlan}
            disabled={deletingPlan}
            className="rounded-lg px-3 py-2 text-xs"
          >
            {paymentPlan ? "Editar plan" : "Crear plan"}
          </Button>
        </div>
      </div>

      {paymentPlan ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {paymentPlan.installments.map((installment) => {
            const runtimeStatus = getInstallmentRuntimeStatus(installment);
            const isPaid = runtimeStatus === "pagado";
            return (
              <div
                key={installment.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-600">
                      Pago #{installment.installmentNumber}
                    </p>
                    <p className="mt-1 text-lg font-semibold text-brand-950">
                      {formatAmount(installment.amount)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "rounded-lg border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]",
                      getInstallmentBadgeClass(runtimeStatus)
                    )}
                  >
                    {runtimeStatus}
                  </span>
                </div>
                <p className="mt-3 text-sm text-slate-600">{formatDate(installment.dueDate)}</p>
                <p className="mt-4 flex min-h-11 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">
                  {isPaid ? "Pagada" : "Registrar el cobro"}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-6 text-center text-sm text-slate-600">
          Este contrato aún no tiene plan de pagos.
        </div>
      )}
    </section>
  );
}

export function ContractCard({
  contract,
  supplierOptions,
  open,
  onToggle,
  onEditPlan,
  onPlanChanged,
}: {
  contract: PaymentContract;
  supplierOptions: string[];
  open: boolean;
  onToggle: () => void;
  onEditPlan: () => void;
  onPlanChanged: (plan: PaymentPlan | null) => void;
}) {
  const [transactions, setTransactions] = useState(contract.transactions);
  const [paymentPlan, setPaymentPlan] = useState(contract.paymentPlan);
  const [loading, setLoading] = useState(false);
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [notesLoaded, setNotesLoaded] = useState(false);
  const toast = useToast();
  const paymentState = getPaymentState(transactions);
  const transactionCount = getTransactionCount(transactions);
  const overdueCount = getOverdueInstallmentCount(paymentPlan);
  const upcomingCount = getUpcomingInstallmentCount(paymentPlan);

  useEffect(() => {
    setTransactions(contract.transactions);
  }, [contract.transactions]);

  useEffect(() => {
    setPaymentPlan(contract.paymentPlan);
  }, [contract.paymentPlan]);

  const loadNotesForIndicator = async () => {
    if (notesLoaded) return;
    try {
      const response = await fetch(`/api/contracts/${contract.id}/notes`, {
        cache: "no-store",
      });
      const payload = await response.json();
      if (payload.notes) {
        setNotes(payload.notes);
      }
      setNotesLoaded(true);
    } catch (error) {
      console.error("Error loading notes for indicator:", error);
      setNotesLoaded(true);
    }
  };

  useEffect(() => {
    if (open) {
      loadNotesForIndicator();
    }
  }, [open]);

  const refreshTransactions = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/contracts/${contract.id}/transactions`, {
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "No se pudieron cargar los pagos.");
      }
      setTransactions(payload.transactions);
    } finally {
      setLoading(false);
    }
  };

  const refreshPaymentPlan = async () => {
    const response = await fetch(`/api/contracts/${contract.id}/payment-plan`, {
      cache: "no-store",
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload?.error || "No se pudo cargar el plan de pagos.");
    }
    setPaymentPlan(payload.plan);
    onPlanChanged(payload.plan);
  };

  useEffect(() => {
    if (notesModalOpen) {
      setNotesLoading(true);
      setNotesError(null);
      fetch(`/api/contracts/${contract.id}/notes`, { cache: "no-store" })
        .then((res) => res.json())
        .then((payload) => {
          if (payload.notes) {
            setNotes(payload.notes);
          } else {
            setNotes("");
          }
        })
        .catch((error) => {
          setNotesError("Error al cargar notas.");
          console.error("Error loading notes:", error);
        })
        .finally(() => setNotesLoading(false));
    }
  }, [notesModalOpen, contract.id]);

  const handleSaveNotes = async () => {
    setNotesSaving(true);
    setNotesError(null);
    try {
      const response = await fetch(`/api/contracts/${contract.id}/notes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notes.trim() || null }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Error al guardar notas.");
      }
      toast.push("Notas guardadas.", "success");
      setNotesModalOpen(false);
    } catch (error) {
      setNotesError((error as Error).message);
    } finally {
      setNotesSaving(false);
    }
  };

  return (
    <article
      id={`payments-${contract.id}`}
      className="rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:border-brand-400 hover:bg-brand-50/50 hover:shadow-md"
    >
      <div className={cn(
        "flex w-full items-center justify-between gap-4 px-5 py-4",
        open && "bg-cyan-100 rounded-t-3xl"
      )}>
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-4 text-left"
        >
          <span
            className={cn(
              "hidden md:flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold",
              "bg-brand-950 text-white"
            )}
            aria-hidden="true"
          >
            {getInitials(contract.clientName) || "AV"}
          </span>
          <span className="grid min-w-0 flex-1 gap-1">
            <span className="block truncate font-display text-lg text-brand-950">
              <span className="whitespace-nowrap">
                {contract.contractNumber ? `#${contract.contractNumber}` : "Sin folio"}
              </span>
              <span className="mx-2 text-slate-300">·</span>
              <span>{contract.destination}</span>
            </span>
            <span className="min-w-0 truncate text-sm text-slate-700">
              {contract.clientName}
            </span>
          </span>
          <Badge className={cn("rounded-lg px-3 py-1.5 text-xs shrink-0", getStateBadgeClass(paymentState))}>
            <span className="hidden md:inline">{getTransactionCountLabel(transactionCount)}</span>
            <span className="md:hidden">{transactionCount}</span>
          </Badge>
          {overdueCount > 0 ? (
            <Badge className="shrink-0 rounded-lg border-rose-200 bg-rose-50 px-3 py-1.5 text-xs text-rose-700">
              {overdueCount} pago(s) vencido(s)
            </Badge>
          ) : upcomingCount > 0 ? (
            <Badge className="shrink-0 rounded-lg border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-700">
              Vence pronto
            </Badge>
          ) : null}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setNotesModalOpen(true);
          }}
          className="relative rounded-lg border border-slate-300 bg-slate-100 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-slate-700 transition hover:border-slate-400 hover:bg-slate-200 shrink-0"
        >
          Notas
          {notes.trim() && (
            <span className="absolute -right-1.5 -top-1.5 h-3 w-3 rounded-full bg-brand-600" />
          )}
        </button>
      </div>

      {open ? (
        <div className="border-t border-slate-200 p-5 pt-1">
          <div className="mb-4 flex justify-end">
            {loading ? (
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Actualizando
              </span>
            ) : null}
          </div>
          <div className="grid gap-6 xl:grid-cols-2 xl:gap-0 xl:divide-x xl:divide-slate-200">
            <div className="xl:pr-6">
            <TransactionPanel
              contractId={contract.id}
              type="customer_payment"
              title="Cobros al cliente"
              emptyLabel="Sin cobros registrados."
              addLabel="Registrar cobro"
              transactions={transactions.customer_payment}
              paymentPlan={paymentPlan}
              onChanged={async () => {
                await refreshTransactions();
                await refreshPaymentPlan();
              }}
            />
            </div>
            <div className="xl:pl-6">
            <TransactionPanel
              contractId={contract.id}
              type="wholesaler_payment"
              title="Pagos al mayorista"
              emptyLabel="Sin pagos registrados."
              addLabel="Registrar pago"
              transactions={transactions.wholesaler_payment}
              supplierOptions={supplierOptions}
              onChanged={refreshTransactions}
            />
            </div>
          </div>
          <PaymentInstallmentsGrid
            contractId={contract.id}
            paymentPlan={paymentPlan}
            onEditPlan={onEditPlan}
            onChanged={refreshPaymentPlan}
          />
        </div>
      ) : null}

      {notesModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setNotesModalOpen(false)}
        >
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-4 pb-4">
              <h2 className="font-display text-xl text-brand-950">Notas del contrato</h2>
              <button
                type="button"
                onClick={() => setNotesModalOpen(false)}
                disabled={notesLoading || notesSaving}
                className="text-2xl leading-none text-slate-400 hover:text-slate-600 disabled:opacity-50"
              >
                ×
              </button>
            </div>
            {notesLoading ? (
              <div className="flex items-center justify-center py-12">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Cargando notas...
                </span>
              </div>
            ) : (
              <>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Añade notas generales para este contrato..."
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:opacity-50"
                  rows={6}
                  disabled={notesSaving}
                />
                {notesError ? (
                  <p className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {notesError}
                  </p>
                ) : null}
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setNotesModalOpen(false)}
                    disabled={notesSaving}
                    className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-50"
                  >
                    Cerrar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveNotes}
                    disabled={notesSaving || notesLoading}
                    className="rounded-full bg-brand-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-brand-700 disabled:opacity-50"
                  >
                    {notesSaving ? "Guardando..." : "Guardar"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </article>
  );
}
