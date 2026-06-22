"use client";

import { FormEvent, WheelEvent, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { ThemedSelect } from "@/components/ui/themed-select";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import type { PaymentInstallment, PaymentPlan } from "@/lib/payment-plans";
import type {
  ContractTransaction,
  TransactionStatus,
  TransactionType,
} from "@/types/transactions";

type AddTransactionModalProps = {
  contractId: string;
  type: TransactionType;
  open: boolean;
  defaultConcept?: string;
  transaction?: ContractTransaction;
  supplierOptions?: string[];
  paymentPlan?: PaymentPlan | null;
  initialInstallmentId?: string | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
};

function getTitle(type: TransactionType, mode: "create" | "edit") {
  if (mode === "edit") return type === "customer_payment" ? "Editar cobro" : "Editar pago";
  return type === "customer_payment" ? "Registrar cobro" : "Registrar pago";
}

const fieldClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200";

function todayDateOnly() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getInstallmentConcept(installment: PaymentInstallment) {
  return `Pago #${installment.installmentNumber}`;
}

export function AddTransactionModal({
  contractId,
  type,
  open,
  defaultConcept = "",
  transaction,
  supplierOptions = [],
  paymentPlan = null,
  initialInstallmentId = null,
  onClose,
  onSaved,
}: AddTransactionModalProps) {
  const mode = transaction ? "edit" : "create";
  const pendingInstallments =
    mode === "create" && type === "customer_payment"
      ? paymentPlan?.installments.filter((installment) => installment.status === "pendiente") ?? []
      : [];
  const initialInstallment =
    pendingInstallments.find((installment) => installment.id === initialInstallmentId) ?? null;
  const [selectedInstallmentId, setSelectedInstallmentId] = useState(initialInstallment?.id ?? "");
  const [concept, setConcept] = useState(
    initialInstallment
      ? getInstallmentConcept(initialInstallment)
      : transaction?.concept ?? defaultConcept
  );
  const [amount, setAmount] = useState(initialInstallment?.amount ?? transaction?.amount ?? "");
  const [date, setDate] = useState(
    initialInstallment ? todayDateOnly() : transaction?.date ?? ""
  );
  const [status, setStatus] = useState<TransactionStatus>(
    initialInstallment ? "pagado" : transaction?.status ?? "pendiente"
  );
  const [notes, setNotes] = useState(transaction?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { confirm, dialog } = useConfirmDialog();
  const toast = useToast();

  const handleAmountWheel = (event: WheelEvent<HTMLInputElement>) => {
    event.currentTarget.blur();
    event.preventDefault();
  };

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [open]);

  if (!open) return null;
  const isWholesalerPayment = type === "wholesaler_payment";
  const conceptOptions = Array.from(
    new Set([
      ...supplierOptions,
      ...(transaction?.concept && !supplierOptions.includes(transaction.concept)
        ? [transaction.concept]
        : []),
    ])
  ).map((supplier) => ({ value: supplier, label: supplier }));

  const reset = () => {
    setSelectedInstallmentId(initialInstallment?.id ?? "");
    setConcept(
      initialInstallment
        ? getInstallmentConcept(initialInstallment)
        : transaction?.concept ?? defaultConcept
    );
    setAmount(initialInstallment?.amount ?? transaction?.amount ?? "");
    setDate(initialInstallment ? todayDateOnly() : transaction?.date ?? "");
    setStatus(initialInstallment ? "pagado" : transaction?.status ?? "pendiente");
    setNotes(transaction?.notes ?? "");
    setError(null);
  };

  const handleInstallmentChange = (installmentId: string) => {
    setSelectedInstallmentId(installmentId);
    const installment = pendingInstallments.find((item) => item.id === installmentId);
    if (!installment) {
      setConcept(transaction?.concept ?? defaultConcept);
      setAmount(transaction?.amount ?? "");
      setDate(transaction?.date ?? "");
      setStatus(transaction?.status ?? "pendiente");
      return;
    }
    setConcept(getInstallmentConcept(installment));
    setAmount(installment.amount);
    setDate((current) => current || todayDateOnly());
    setStatus("pagado");
  };

  const handleDelete = async () => {
    if (!transaction) return;
    confirm("¿Eliminar esta transacción? Esta acción no se puede deshacer.", async () => {
      setDeleting(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/contracts/${contractId}/transactions/${transaction.id}`,
          { method: "DELETE" }
        );
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.error || "No se pudo eliminar la transacción.");
        }
        toast.push(`${transaction.concept} eliminado.`, "success");
        await onSaved();
        onClose();
      } catch (deleteError) {
        setError((deleteError as Error).message);
      } finally {
        setDeleting(false);
      }
    }, { confirmLabel: "Eliminar" });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (mode === "edit") {
      confirm("¿Guardar cambios en esta transacción?", performSave, { confirmLabel: "Guardar" });
    } else {
      await performSave();
    }
  };

  const performSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(
        mode === "edit" && transaction
          ? `/api/contracts/${contractId}/transactions/${transaction.id}`
          : `/api/contracts/${contractId}/transactions`,
        {
          method: mode === "edit" ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            concept,
            amount,
            date,
            status,
            notes,
            paymentInstallmentId:
              mode === "create" && type === "customer_payment"
                ? selectedInstallmentId || null
                : null,
          }),
        }
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "No se pudo guardar el movimiento.");
      }
      await onSaved();
      if (mode === "create") reset();
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
      aria-label={getTitle(type, mode)}
    >
      <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl text-brand-950">{getTitle(type, mode)}</h2>
            <p className="mt-1 text-sm text-slate-600">
              {mode === "edit"
                ? "Actualiza los datos del movimiento."
                : "Guarda el movimiento y agrega comprobantes desde la tabla."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600 transition hover:border-brand-300 hover:text-brand-700"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
              {isWholesalerPayment ? "Mayorista o concepto" : "Concepto"}
            </span>
            {isWholesalerPayment ? (
              <>
                <input
                  value={concept}
                  onChange={(event) => setConcept(event.target.value)}
                  required
                  list="mayorista-options"
                  placeholder="Selecciona mayorista o escribe un concepto"
                  className={fieldClass}
                />
                {conceptOptions.length > 0 ? (
                  <datalist id="mayorista-options">
                    {conceptOptions.map((option) => (
                      <option key={option.value} value={option.value} />
                    ))}
                  </datalist>
                ) : null}
              </>
            ) : (
              <input
                value={concept}
                onChange={(event) => setConcept(event.target.value)}
                required
                placeholder={isWholesalerPayment ? "Mayorista" : defaultConcept}
                className={fieldClass}
              />
            )}
          </label>

          {!isWholesalerPayment && mode === "create" && pendingInstallments.length > 0 ? (
            <div className="space-y-2">
              <span className="block text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                Cuota del plan
              </span>
              <ThemedSelect
                value={selectedInstallmentId}
                onChange={handleInstallmentChange}
                options={[
                  { value: "", label: "Sin vincular cuota" },
                  ...pendingInstallments.map((installment) => ({
                    value: installment.id,
                    label: `${getInstallmentConcept(installment)} · ${installment.amount} · ${
                      installment.dueDate
                    }`,
                  })),
                ]}
              />
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                Monto
              </span>
              <input
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                required
                type="number"
                min="0"
                step="0.01"
                onWheel={handleAmountWheel}
                className={`${fieldClass} no-number-spinner`}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                Fecha
              </span>
              <input
                value={date}
                onChange={(event) => setDate(event.target.value)}
                type="date"
                className={fieldClass}
              />
            </label>
          </div>

          <div className="space-y-2">
            <span className="block text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
              Estado
            </span>
            <ThemedSelect
              value={status}
              onChange={(value) => setStatus(value as TransactionStatus)}
              options={[
                { value: "pendiente", label: "Pendiente" },
                { value: "pagado", label: "Pagado" },
              ]}
            />
          </div>

          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
              Notas
            </span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              className={fieldClass}
            />
          </label>

          {error ? (
            <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </p>
          ) : null}

          <div className="grid grid-cols-3 gap-3 pt-2">
            {mode === "edit" ? (
              <Button
                type="button"
                variant="secondary"
                onClick={handleDelete}
                disabled={deleting || saving}
                className="rounded-lg px-4 py-2 text-xs text-rose-600 hover:bg-rose-50"
              >
                {deleting ? "Eliminando..." : "Eliminar"}
              </Button>
            ) : (
              <div />
            )}
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={saving || deleting}
              className="rounded-lg px-4 py-2 text-xs"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || deleting} className="rounded-lg px-4 py-2 text-xs">
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </div>
      {dialog}
    </div>
  );
}
