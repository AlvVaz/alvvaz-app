"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { ContractTransaction, TransactionType } from "@/types/transactions";

import { AddTransactionModal } from "./AddTransactionModal";
import { AttachmentCell } from "./AttachmentCell";

type TransactionPanelProps = {
  contractId: string;
  type: TransactionType;
  title: string;
  emptyLabel: string;
  addLabel: string;
  transactions: ContractTransaction[];
  supplierOptions?: string[];
  onChanged: () => Promise<void>;
};

function formatAmount(value: string) {
  const number = Number(value);
  if (!Number.isFinite(number)) return value;
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

function getStatusEmoji(status: ContractTransaction["status"]) {
  return status === "pagado" ? "✅" : "⏳";
}

function getStatusLabel(status: ContractTransaction["status"]) {
  return status === "pagado" ? "Pagado" : "Pendiente";
}

function getNextNumberedConcept(transactions: ContractTransaction[], prefix: "Anticipo" | "Pago") {
  const pattern = new RegExp(`${prefix}\\s*#?\\s*(\\d+)`, "i");
  const maxNumber = transactions.reduce((max, transaction) => {
    const match = transaction.concept.match(pattern);
    if (!match) return max;
    const number = Number(match[1]);
    return Number.isFinite(number) && number > max ? number : max;
  }, 0);

  return `${prefix} #${maxNumber + 1}`;
}

export function TransactionPanel({
  contractId,
  type,
  title,
  emptyLabel,
  addLabel,
  transactions,
  supplierOptions = [],
  onChanged,
}: TransactionPanelProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<ContractTransaction | null>(null);
  const defaultConcept =
    type === "customer_payment"
      ? getNextNumberedConcept(transactions, "Anticipo")
      : "";
  const conceptHeader = type === "customer_payment" ? "Concepto" : "Mayorista";

  return (
    <section className="min-w-0">
      <div className="flex items-center justify-between gap-3 px-1 pb-2 pt-0">
        <h3 className="font-display text-base text-brand-950">{title}</h3>
        <span className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">
          {transactions.length} movimientos
        </span>
      </div>

      <div className="border-y border-slate-200">
        {transactions.length > 0 ? (
          <>
            {/* Desktop table view */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[580px] text-left text-sm">
                <thead className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  <tr>
                    <th className="w-8 px-2 py-3" aria-label="Estado" />
                    <th className="px-4 py-3">{conceptHeader}</th>
                    <th className="px-4 py-3">Monto</th>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Comprobante</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="align-top">
                      <td className="px-2 py-3 text-center">
                        <span
                          title={getStatusLabel(transaction.status)}
                          aria-label={getStatusLabel(transaction.status)}
                        >
                          {getStatusEmoji(transaction.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setEditingTransaction(transaction)}
                          className="font-medium text-brand-950 transition hover:text-blue-600 hover:underline"
                        >
                          {transaction.concept}
                        </button>
                        {transaction.notes ? (
                          <div className="mt-1 truncate text-xs text-slate-500">
                            {transaction.notes.split(" ").slice(0, 2).join(" ")}…
                          </div>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-800">
                        {formatAmount(transaction.amount)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        {formatDate(transaction.date)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <AttachmentCell transaction={transaction} onChanged={onChanged} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card view */}
            <div className="md:hidden space-y-3 px-0 py-3">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="rounded-lg border border-slate-200 bg-white p-3 space-y-3">
                  <div className="flex items-start gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingTransaction(transaction)}
                      className="font-medium text-brand-950 transition hover:text-blue-600 hover:underline"
                    >
                      {transaction.concept}
                    </button>
                    <span title={getStatusLabel(transaction.status)} className="shrink-0 ml-auto">
                      {getStatusEmoji(transaction.status)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-lg font-semibold text-slate-800">
                      {formatAmount(transaction.amount)}
                    </div>
                    <div className="text-sm text-slate-600">
                      {formatDate(transaction.date)}
                    </div>
                  </div>
                  {transaction.notes ? (
                    <div className="hidden text-xs text-slate-500 border-t border-slate-100 pt-2">
                      {transaction.notes.split(" ").slice(0, 2).join(" ")}…
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                      Comprobante
                    </span>
                    <AttachmentCell transaction={transaction} onChanged={onChanged} />
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="px-4 py-8 text-center text-sm text-slate-500">{emptyLabel}</div>
        )}
      </div>

      <div className="px-1 pt-4">
        <Button
          type="button"
          variant="secondary"
          onClick={() => setModalOpen(true)}
          className="rounded-lg px-3 py-2 text-xs"
        >
          + {addLabel}
        </Button>
      </div>

      <AddTransactionModal
        key={`${type}-${defaultConcept}`}
        contractId={contractId}
        type={type}
        open={modalOpen}
        defaultConcept={defaultConcept}
        supplierOptions={type === "wholesaler_payment" ? supplierOptions : []}
        onClose={() => setModalOpen(false)}
        onSaved={onChanged}
      />

      {editingTransaction ? (
        <AddTransactionModal
          key={`edit-${editingTransaction.id}`}
          contractId={contractId}
          type={type}
          open
          transaction={editingTransaction}
          supplierOptions={type === "wholesaler_payment" ? supplierOptions : []}
          onClose={() => setEditingTransaction(null)}
          onSaved={onChanged}
        />
      ) : null}
    </section>
  );
}
