"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { ThemedSelect } from "@/components/ui/themed-select";
import type { PaymentPlan, PaymentPlanFrequency } from "@/lib/payment-plans";

type PaymentPlanContract = {
  id: string;
  contractNumber: string | null;
  clientName: string;
  destination: string;
  reservationDate: string | null;
  departureDate: string | null;
  liquidationDate: string | null;
  totalPrice: string | null;
  firstPayment: string | null;
  paymentPlan: PaymentPlan | null;
};

type PaymentPlanModalProps = {
  open: boolean;
  contracts: PaymentPlanContract[];
  initialContractId?: string | null;
  onClose: () => void;
  onSaved: (contractId: string, plan: PaymentPlan) => void;
};

const frequencyOptions = [
  { value: "contado", label: "Contado" },
  { value: "semanal", label: "Semanal" },
  { value: "quincenal", label: "Quincenal" },
  { value: "mensual", label: "Mensual" },
];

const fieldClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:bg-slate-100 disabled:text-slate-400";

function parseMoney(value: string | null | undefined) {
  const cleaned = String(value ?? "").replace(/[^\d.-]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoneyInput(value: string | null | undefined) {
  const parsed = parseMoney(value);
  if (!parsed) return "";
  return parsed.toFixed(2);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  const day = next.getDate();
  next.setMonth(next.getMonth() + months);
  if (next.getDate() !== day) {
    next.setDate(0);
  }
  return next;
}

function toDateOnly(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayDateOnly() {
  return toDateOnly(new Date());
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatAmount(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(value);
}

function buildPreview({
  totalAmount,
  depositAmount,
  startDate,
  endDate,
  frequency,
  installmentCount,
}: {
  totalAmount: string;
  depositAmount: string;
  startDate: string;
  endDate: string;
  frequency: PaymentPlanFrequency;
  installmentCount: string;
}) {
  const total = parseMoney(totalAmount);
  const deposit = parseMoney(depositAmount);
  const count = frequency === "contado" ? 1 : Number(installmentCount);
  const dates = buildScheduleDates({ startDate, endDate, frequency, installmentCount: count });

  if (
    total <= 0 ||
    deposit > total ||
    !Number.isInteger(count) ||
    count < 1 ||
    dates.length === 0
  ) {
    return [];
  }

  const balance = Math.max(total - deposit, 0);
  const actualCount = dates.length;
  const baseAmount = Math.floor((balance / actualCount) * 100) / 100;
  const totalBase = baseAmount * actualCount;
  const remainder = Number((balance - totalBase).toFixed(2));

  return dates.map((dueDate, index) => {
    return {
      number: index + 1,
      dueDate,
      amount: Number((baseAmount + (index === actualCount - 1 ? remainder : 0)).toFixed(2)),
    };
  });
}

function buildScheduleDates({
  startDate,
  endDate,
  frequency,
  installmentCount,
}: {
  startDate: string;
  endDate: string;
  frequency: PaymentPlanFrequency;
  installmentCount?: number;
}) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
  if (frequency === "contado" || start >= end) return [toDateOnly(end)];

  const dates: string[] = [];
  let current = start;
  while (current < end && dates.length < 119) {
    dates.push(toDateOnly(current));
    const next =
      frequency === "mensual"
        ? addMonths(current, 1)
        : addDays(current, frequency === "quincenal" ? 14 : 7);
    if (next <= current) break;
    current = next;
  }

  const endDateOnly = toDateOnly(end);
  if (dates[dates.length - 1] !== endDateOnly) {
    dates.push(endDateOnly);
  }

  const count = Math.min(Math.max(installmentCount ?? dates.length, 1), dates.length);
  if (count >= dates.length) return dates;
  if (count === 1) return [endDateOnly];
  return [...dates.slice(0, count - 1), endDateOnly];
}

export function PaymentPlanModal({
  open,
  contracts,
  initialContractId,
  onClose,
  onSaved,
}: PaymentPlanModalProps) {
  const [selectedContractId, setSelectedContractId] = useState(initialContractId ?? "");
  const selectedContract = contracts.find((contract) => contract.id === selectedContractId) ?? null;
  const [totalAmount, setTotalAmount] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [startDate, setStartDate] = useState(todayDateOnly());
  const [endDate, setEndDate] = useState("");
  const [frequency, setFrequency] = useState<PaymentPlanFrequency>("mensual");
  const [installmentCount, setInstallmentCount] = useState("3");
  const [installmentCountTouched, setInstallmentCountTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contractOptions = contracts.map((contract) => ({
    value: contract.id,
    label: `${contract.contractNumber ? `#${contract.contractNumber} · ` : ""}${contract.clientName} · ${contract.destination}`,
  }));

  useEffect(() => {
    if (!open) return;
    setSelectedContractId(initialContractId ?? contracts[0]?.id ?? "");
  }, [contracts, initialContractId, open]);

  useEffect(() => {
    if (!selectedContract) return;
    const existingPlan = selectedContract.paymentPlan;
    setTotalAmount(existingPlan?.totalAmount ?? formatMoneyInput(selectedContract.totalPrice));
    setDepositAmount(existingPlan?.depositAmount ?? formatMoneyInput(selectedContract.firstPayment));
    setStartDate(selectedContract.reservationDate ?? existingPlan?.startDate ?? todayDateOnly());
    setEndDate(existingPlan?.endDate ?? selectedContract.liquidationDate ?? selectedContract.departureDate ?? "");
    setFrequency(existingPlan?.frequency ?? "mensual");
    setInstallmentCount(String(existingPlan?.installmentCount ?? 3));
    setInstallmentCountTouched(false);
    setError(null);
  }, [selectedContract]);

  const autoInstallmentCount = useMemo(
    () =>
      buildScheduleDates({
        startDate,
        endDate,
        frequency,
      }).length,
    [endDate, frequency, startDate]
  );

  useEffect(() => {
    const nextCount = frequency === "contado" ? 1 : autoInstallmentCount;
    if (!nextCount) return;
    const currentCount = Number(installmentCount);
    if (
      !installmentCountTouched ||
      !Number.isInteger(currentCount) ||
      currentCount > nextCount
    ) {
      setInstallmentCount(String(nextCount));
    }
  }, [autoInstallmentCount, frequency, installmentCount, installmentCountTouched]);

  const preview = useMemo(
    () =>
      buildPreview({
        totalAmount,
        depositAmount,
        startDate,
        endDate,
        frequency,
        installmentCount,
      }),
    [depositAmount, endDate, frequency, installmentCount, startDate, totalAmount]
  );
  const balance = Math.max(parseMoney(totalAmount) - parseMoney(depositAmount), 0);

  if (!open) return null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedContractId) {
      setError("Selecciona un contrato.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/contracts/${selectedContractId}/payment-plan`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          totalAmount,
          depositAmount,
          startDate,
          endDate,
          frequency,
          installmentCount: frequency === "contado" ? 1 : installmentCount,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "No se pudo guardar el plan.");
      }
      onSaved(selectedContractId, payload.plan as PaymentPlan);
      onClose();
    } catch (submitError) {
      setError((submitError as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-950/40 px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-label="Plan de pagos"
    >
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl text-brand-950">Plan de pagos</h2>
            <p className="mt-1 text-sm text-slate-600">
              Genera o reemplaza los pagos programados del contrato.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600 transition hover:border-brand-300 hover:text-brand-700 disabled:opacity-50"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2 space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                Contrato
              </span>
              <ThemedSelect
                value={selectedContractId}
                onChange={setSelectedContractId}
                options={contractOptions}
                searchable
                searchPlaceholder="Buscar contrato"
              />
            </div>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                Monto total
              </span>
              <input
                value={totalAmount}
                onChange={(event) => setTotalAmount(event.target.value)}
                required
                type="number"
                min="0"
                step="0.01"
                className={fieldClass}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                Depósito pagado
              </span>
              <input
                value={depositAmount}
                onChange={(event) => setDepositAmount(event.target.value)}
                required
                type="number"
                min="0"
                step="0.01"
                className={fieldClass}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                Inicio de pagos
              </span>
              <input
                value={startDate}
                onChange={(event) => {
                  setStartDate(event.target.value);
                  setInstallmentCountTouched(false);
                }}
                type="date"
                required
                className={fieldClass}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                Fecha límite
              </span>
              <input
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                type="date"
                required
                className={fieldClass}
              />
            </label>

            <div className="space-y-2">
              <span className="block text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                Tipo
              </span>
              <ThemedSelect
                value={frequency}
                onChange={(value) => {
                  const next = value as PaymentPlanFrequency;
                  setFrequency(next);
                  setInstallmentCountTouched(false);
                  if (next === "contado") setInstallmentCount("1");
                }}
                options={frequencyOptions}
              />
            </div>

            <label className="block space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                  Número de pagos
                </span>
                {frequency !== "contado" ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (installmentCountTouched) {
                        setInstallmentCount(String(Math.max(autoInstallmentCount, 1)));
                        setInstallmentCountTouched(false);
                        return;
                      }
                      setInstallmentCountTouched(true);
                    }}
                    className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-600"
                  >
                    {installmentCountTouched ? "Auto" : "Ajustar"}
                  </button>
                ) : null}
              </div>
              <input
                value={frequency === "contado" ? "1" : installmentCount}
                onChange={(event) => {
                  setInstallmentCount(event.target.value);
                  setInstallmentCountTouched(true);
                }}
                disabled={frequency === "contado"}
                readOnly={!installmentCountTouched}
                required
                type="number"
                min="1"
                max={Math.max(autoInstallmentCount, 1)}
                className={`${fieldClass} read-only:bg-slate-100`}
              />
            </label>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                  Preview
                </p>
                <p className="text-sm text-slate-600">Balance a programar: {formatAmount(balance)}</p>
              </div>
              <span className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">
                {preview.length} pago(s)
              </span>
            </div>

            {preview.length > 0 ? (
              <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {preview.map((installment) => (
                  <div
                    key={installment.number}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  >
                    <div className="font-semibold text-brand-950">
                      Pago #{installment.number}
                    </div>
                    <div className="text-slate-600">{formatDate(installment.dueDate)}</div>
                    <div className="font-semibold text-slate-800">
                      {formatAmount(installment.amount)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">
                Completa los datos del plan para ver los pagos antes de guardar.
              </p>
            )}
          </div>

          {error ? (
            <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || preview.length === 0}>
              {saving ? "Guardando..." : "Guardar plan"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
