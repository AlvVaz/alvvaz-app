"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { Contract } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { ContractForm } from "./ContractForm";
import ContractSummaryActions from "./ContractSummaryActions";
import ContractStatusButtons from "./ContractStatusButtons";
import { useContractsToast } from "./ContractsToastProvider";

type ContractsSectionProps = {
  title: string;
  badgeLabel: string;
  emptyMessage: string;
  contracts: Contract[];
  updateAction: (
    prevState: { submittedAt: number },
    formData: FormData
  ) => Promise<{ submittedAt: number }>;
  deleteAction?: (formData: FormData) => void;
  bulkDeleteAction: (ids: string[]) => Promise<{ ok: boolean; error?: string }>;
  enableSort?: boolean;
  hideTitle?: boolean;
  hideBadge?: boolean;
  organizerOptions?: { value: string; label: string }[];
};

const getStatusCardStyles = (status: string) => {
  if (status === "pending") {
    return "border border-amber-200/80 bg-gradient-to-br from-white via-amber-50 to-amber-200/60 shadow-[0_12px_28px_rgba(245,158,11,0.18)]";
  }
  if (status === "signed" || status === "paid") {
    return "border border-emerald-200/70 bg-gradient-to-br from-white via-emerald-50 to-emerald-200/60 shadow-[0_12px_28px_rgba(16,185,129,0.18)]";
  }
  if (status === "canceled") {
    return "border border-rose-200/80 bg-gradient-to-br from-white via-rose-50 to-rose-200/60 shadow-[0_12px_28px_rgba(244,63,94,0.18)]";
  }
  return "border border-brand-200/80 bg-gradient-to-br from-white via-brand-50 to-brand-200/60 shadow-[0_12px_28px_rgba(77,143,224,0.16)]";
};

export default function ContractsSection({
  title,
  badgeLabel,
  emptyMessage,
  contracts,
  updateAction,
  deleteAction,
  bulkDeleteAction,
  enableSort,
  hideTitle = false,
  hideBadge = false,
  organizerOptions = [],
}: ContractsSectionProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortMode, setSortMode] = useState("recent");
  const [isPending, startTransition] = useTransition();
  const { push: pushToast } = useContractsToast();
  const router = useRouter();

  const sortedContracts = useMemo(() => {
    const list = [...contracts];
    const byName = (a: Contract, b: Contract) =>
      a.clientName.localeCompare(b.clientName, "es", { sensitivity: "base" });
    const byNumber = (a: Contract, b: Contract) => {
      const aNum = Number(a.contractNumber ?? 0);
      const bNum = Number(b.contractNumber ?? 0);
      if (Number.isFinite(aNum) && Number.isFinite(bNum)) return aNum - bNum;
      return String(a.contractNumber ?? "").localeCompare(String(b.contractNumber ?? ""));
    };
    switch (sortMode) {
      case "name-asc":
        return list.sort(byName);
      case "name-desc":
        return list.sort((a, b) => byName(b, a));
      case "number-asc":
        return list.sort(byNumber);
      case "number-desc":
        return list.sort((a, b) => byNumber(b, a));
      case "recent":
      default:
        return list;
    }
  }, [contracts, sortMode]);

  const allSelected = useMemo(
    () => contracts.length > 0 && selectedIds.size === contracts.length,
    [contracts.length, selectedIds]
  );

  const toggleAll = () => {
    setSelectedIds((current) => {
      if (contracts.length === 0) return current;
      if (current.size === contracts.length) return new Set();
      return new Set(contracts.map((contract) => contract.id));
    });
  };

  const toggleOne = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBulkDelete = () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    startTransition(async () => {
      const result = await bulkDeleteAction(ids);
      if (result?.ok) {
        setSelectedIds(new Set());
        pushToast("Contratos eliminados.", "info");
        router.refresh();
      } else {
        pushToast(result?.error || "No se pudo eliminar.", "error");
      }
    });
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {!hideTitle || !hideBadge ? (
          <div className="flex flex-wrap items-center gap-3">
            {!hideTitle ? (
              <h3 className="font-display text-lg text-brand-950">{title}</h3>
            ) : null}
            {!hideBadge ? (
              <span className="inline-flex h-8 items-center rounded-full border border-brand-200 px-3 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
                {badgeLabel}
              </span>
            ) : null}
          </div>
        ) : (
          <span />
        )}
        <div className="flex flex-wrap items-center gap-3">
          {enableSort ? (
            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value)}
              className="h-8 rounded-full border border-brand-200 bg-white px-3 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700"
            >
              <option value="recent">Más reciente</option>
              <option value="name-asc">Nombre A–Z</option>
              <option value="name-desc">Nombre Z–A</option>
              <option value="number-asc">Contrato ↑</option>
              <option value="number-desc">Contrato ↓</option>
            </select>
          ) : null}
          <button
            type="button"
            onClick={toggleAll}
            className="inline-flex h-8 items-center rounded-full border border-brand-200 px-3 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700 transition hover:border-brand-300 hover:text-brand-900"
          >
            {allSelected ? "Quitar selección" : "Seleccionar todo"}
          </button>
          <Button
            type="button"
            variant="subtle"
            className="h-8 rounded-full border border-rose-300 bg-rose-50 px-3 text-xs font-semibold uppercase tracking-[0.2em] text-rose-700 shadow-sm hover:border-rose-400 hover:text-rose-800"
            onClick={handleBulkDelete}
            disabled={!selectedIds.size || isPending}
          >
            Eliminar seleccionados
          </Button>
        </div>
      </div>

      {contracts.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-brand-200 bg-white/60 p-6 text-sm text-slate-600">
          {emptyMessage}
        </div>
      ) : (
        <div className="grid gap-4">
          {sortedContracts.map((contract) => (
            <details
              key={contract.id}
              id={`contract-${contract.id}`}
              className="rounded-3xl border border-transparent bg-transparent shadow-none"
            >
              <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                <div className="flex items-stretch gap-3">
                  <div
                    className={cn(
                      "flex-1 rounded-[28px] px-6 py-4 text-brand-950",
                      getStatusCardStyles(contract.status)
                    )}
                  >
                    <div className="grid items-center gap-4 md:grid-cols-[auto_2fr_1.4fr_1fr_0.8fr]">
                      <div className="flex items-start justify-center pt-1">
                        <input
                          type="checkbox"
                          aria-label="Seleccionar contrato"
                          checked={selectedIds.has(contract.id)}
                          onChange={() => toggleOne(contract.id)}
                          onClick={(event) => event.stopPropagation()}
                          className="h-4 w-4 rounded border-brand-300 text-brand-600"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                          Contrato
                        </p>
                        <p className="font-display text-lg text-brand-950">
                          {contract.title}
                        </p>
                        <p className="text-xs text-brand-700/80">
                          {contract.contractNumber ? `#${contract.contractNumber}` : "Sin folio"}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                          Cliente
                        </p>
                        <p className="text-sm text-brand-900">{contract.clientName}</p>
                        <p className="text-sm text-brand-700/80">{contract.destination}</p>
                      </div>
                      <div className="flex flex-col items-center text-center">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                          Estado
                        </p>
                        <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.2em]">
                          {contract.status === "pending" && (
                            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-amber-700">
                              Pendiente
                            </span>
                          )}
                          {contract.status === "signed" && (
                            <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-1 text-sky-700">
                              Firmado
                            </span>
                          )}
                          {contract.status === "paid" && (
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-700">
                              Pagado
                            </span>
                          )}
                          {contract.status === "canceled" && (
                            <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-rose-700">
                              Cancelado
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 text-right md:items-start md:text-left">
                        <ContractSummaryActions
                          contractId={contract.id}
                          contractTitle={contract.title}
                          contractNumber={contract.contractNumber}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <ContractStatusButtons contractId={contract.id} />
                  </div>
                </div>
              </summary>

              <div className="border-t border-slate-200 px-6 py-4">
                <ContractForm
                  action={updateAction}
                  deleteAction={deleteAction}
                  initialContract={contract}
                  submitLabel="Guardar cambios"
                  organizerOptions={organizerOptions}
                />
              </div>
            </details>
          ))}
        </div>
      )}
    </section>
  );
}
