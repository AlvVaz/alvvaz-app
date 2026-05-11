"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { ThemedSelect } from "@/components/ui/themed-select";
import { cn } from "@/lib/utils";
import type { ContractStatus } from "@/lib/db";
import type { TransactionsByType } from "@/types/transactions";

import { TransactionPanel } from "./TransactionPanel";

type PaymentState = "sin_pagos" | "parcial" | "pagado";
type FilterState = "todos" | "parcial" | "pagado";

export type PaymentContract = {
  id: string;
  contractNumber: string | null;
  clientName: string;
  destination: string;
  status: ContractStatus;
  transactions: TransactionsByType;
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
  if (state === "pagado") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (state === "parcial") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function getTransactionCount(transactions: TransactionsByType) {
  return transactions.customer_payment.length + transactions.wholesaler_payment.length;
}

function getTransactionCountLabel(count: number) {
  return count === 1 ? "1 transaccion" : `${count} transacciones`;
}

export function PaymentsContractsList({
  contracts,
  supplierOptions,
}: {
  contracts: PaymentContract[];
  supplierOptions: string[];
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterState>("todos");
  const [openContractId, setOpenContractId] = useState<string | null>(null);

  const filteredContracts = useMemo(() => {
    const normalizedQuery = normalizeText(query.trim());

    return contracts.filter((contract) => {
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
  }, [contracts, query, statusFilter]);

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
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
            />
          ))
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-8 text-center text-sm text-slate-600">
            No hay contratos que coincidan con los filtros.
          </div>
        )}
      </div>
    </section>
  );
}

export function ContractCard({
  contract,
  supplierOptions,
  open,
  onToggle,
}: {
  contract: PaymentContract;
  supplierOptions: string[];
  open: boolean;
  onToggle: () => void;
}) {
  const [transactions, setTransactions] = useState(contract.transactions);
  const [loading, setLoading] = useState(false);
  const paymentState = getPaymentState(transactions);
  const transactionCount = getTransactionCount(transactions);

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

  return (
    <article
      id={`payments-${contract.id}`}
      className="rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:border-brand-400 hover:bg-brand-50/50 hover:shadow-md"
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <span
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold",
              "bg-brand-950 text-white"
            )}
            aria-hidden="true"
          >
            {getInitials(contract.clientName) || "AV"}
          </span>
          <span className="grid min-w-0 flex-1 gap-1 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <span className="min-w-0">
              <span className="block truncate font-display text-lg text-brand-950">
                <span className="whitespace-nowrap">
                  {contract.contractNumber ? `#${contract.contractNumber}` : "Sin folio"}
                </span>
                <span className="mx-2 text-slate-300">·</span>
                <span>{contract.destination}</span>
              </span>
              <span className="mt-1 block truncate text-sm text-slate-700">
                {contract.clientName}
              </span>
              </span>
              <span className="md:justify-self-end">
                <Badge className={cn("rounded-lg px-3 py-1.5", getStateBadgeClass(paymentState))}>
                  {getTransactionCountLabel(transactionCount)}
              </Badge>
            </span>
          </span>
        </div>
      </button>

      {open ? (
        <div className="border-t border-slate-200 p-5">
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
              onChanged={refreshTransactions}
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
        </div>
      ) : null}
    </article>
  );
}
