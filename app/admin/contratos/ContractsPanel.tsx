"use client";

import { useMemo, useState } from "react";

import type { Contract } from "@/lib/db";

import ContractsSection from "./ContractsSection";

type ContractsPanelProps = {
  contracts: Contract[];
  updateAction: (
    prevState: { submittedAt: number; error?: string },
    formData: FormData
  ) => Promise<{ submittedAt: number; error?: string }>;
  deleteAction?: (formData: FormData) => void;
  bulkDeleteAction: (ids: string[]) => Promise<{ ok: boolean; error?: string }>;
  organizerOptions?: { value: string; label: string }[];
  canEditContractNumber?: boolean;
};

const normalize = (value: string) => value.trim().toLowerCase();

const matchesValue = (value: string | null | undefined, query: string) => {
  if (!query) return true;
  if (!value) return false;
  return normalize(value).includes(query);
};

export default function ContractsPanel({
  contracts,
  updateAction,
  deleteAction,
  bulkDeleteAction,
  organizerOptions = [],
  canEditContractNumber = false,
}: ContractsPanelProps) {
  const [filters, setFilters] = useState({
    id: "",
    name: "",
    contact: "",
  });

  const normalizedId = normalize(filters.id).replace(/^#/, "");
  const normalizedName = normalize(filters.name);
  const normalizedContact = normalize(filters.contact).replace(/\s+/g, "");
  const hasFilters = Boolean(normalizedId || normalizedName || normalizedContact);

  const filteredContracts = useMemo(() => {
    if (!hasFilters) return contracts;

    return contracts.filter((contract) => {
      const matchesId =
        matchesValue(contract.contractNumber, normalizedId) ||
        matchesValue(contract.id, normalizedId);

      const matchesName =
        matchesValue(contract.title, normalizedName) ||
        matchesValue(contract.clientName, normalizedName);

      const travelerMatches = contract.travelers?.some((traveler) => {
        if (!normalizedContact) return false;
        const phone = normalize(traveler.phone || "").replace(/\s+/g, "");
        return phone.includes(normalizedContact);
      });

      const metadataContact =
        typeof contract.metadata?.contact === "string"
          ? contract.metadata.contact
          : "";
      const metadataPhone =
        typeof contract.metadata?.phone === "string" ? contract.metadata.phone : "";
      const metadataEmail =
        typeof contract.metadata?.email === "string" ? contract.metadata.email : "";

      const metadataMatches =
        matchesValue(metadataContact, normalizedContact) ||
        matchesValue(metadataPhone, normalizedContact) ||
        matchesValue(metadataEmail, normalizedContact);

      const matchesContact =
        !normalizedContact || travelerMatches || metadataMatches;

      return matchesId && matchesName && matchesContact;
    });
  }, [contracts, hasFilters, normalizedContact, normalizedId, normalizedName]);

  const resolveContractYear = (contract: Contract) => {
    const number = String(contract.contractNumber ?? "");
    if (/^2025/.test(number)) {
      return 2025;
    }

    const dateCandidates = [
      contract.reservationDate,
      contract.departureDate,
      contract.createdAt,
    ];

    for (const candidate of dateCandidates) {
      if (!candidate) continue;
      const parsed = new Date(candidate);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.getFullYear();
      }
    }

    return null;
  };

  const is2025 = (contract: Contract) => resolveContractYear(contract) === 2025;

  const contracts2025 = filteredContracts.filter(is2025);
  const non2025Contracts = filteredContracts.filter((contract) => !is2025(contract));

  const approvedContracts = non2025Contracts.filter(
    (contract) => contract.status === "paid" || contract.status === "signed"
  );
  const pendingContracts = non2025Contracts.filter(
    (contract) => contract.status === "pending"
  );
  const canceledContracts = non2025Contracts.filter(
    (contract) => contract.status === "canceled"
  );

  return (
    <>
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-lg text-brand-950">Filtrar contratos</h3>
            <p className="mt-1 text-sm text-slate-600">
              Busca por ID, nombre del cliente o contacto.
            </p>
          </div>
          {hasFilters ? (
            <button
              type="button"
              onClick={() => setFilters({ id: "", name: "", contact: "" })}
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
            >
              Limpiar filtros
            </button>
          ) : null}
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <label className="block space-y-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            Contrato ID
            <input
              type="text"
              value={filters.id}
              onChange={(event) =>
                setFilters((current) => ({ ...current, id: event.target.value }))
              }
              placeholder="#2034"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-normal text-slate-900 shadow-sm outline-none transition focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-200"
            />
          </label>
          <label className="block space-y-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            Nombre
            <input
              type="text"
              value={filters.name}
              onChange={(event) =>
                setFilters((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="Cliente o ciudad"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-normal text-slate-900 shadow-sm outline-none transition focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-200"
            />
          </label>
          <label className="block space-y-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            Contacto
            <input
              type="text"
              value={filters.contact}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  contact: event.target.value,
                }))
              }
              placeholder="Teléfono o email"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-normal text-slate-900 shadow-sm outline-none transition focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-200"
            />
          </label>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Mostrando {filteredContracts.length} de {contracts.length} contratos.
        </p>
      </section>

      <ContractsSection
        title="Contratos pendientes"
        badgeLabel={`${pendingContracts.length} pendientes`}
        emptyMessage="No hay contratos pendientes por revisar."
        contracts={pendingContracts}
        updateAction={updateAction}
        deleteAction={deleteAction}
        bulkDeleteAction={bulkDeleteAction}
        organizerOptions={organizerOptions}
        canEditContractNumber={canEditContractNumber}
      />

      <ContractsSection
        title="Contratos aprobados"
        badgeLabel={`${approvedContracts.length} aprobados`}
        emptyMessage="Aún no hay contratos aprobados."
        contracts={approvedContracts}
        updateAction={updateAction}
        deleteAction={deleteAction}
        bulkDeleteAction={bulkDeleteAction}
        organizerOptions={organizerOptions}
        enableSort
        canEditContractNumber={canEditContractNumber}
      />

      <ContractsSection
        title="Contratos cancelados"
        badgeLabel={`${canceledContracts.length} cancelados`}
        emptyMessage="No hay contratos cancelados."
        contracts={canceledContracts}
        updateAction={updateAction}
        deleteAction={deleteAction}
        bulkDeleteAction={bulkDeleteAction}
        organizerOptions={organizerOptions}
        canEditContractNumber={canEditContractNumber}
      />

      {contracts2025.length > 0 ? (
        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <details className="group">
            <summary className="cursor-pointer list-none px-6 py-4 [&::-webkit-details-marker]:hidden">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg text-brand-950">
                    Contratos 2025
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Contratos creados en 2025.
                  </p>
                </div>
                <span className="inline-flex h-8 items-center rounded-full border border-brand-200 px-3 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
                  {contracts2025.length} contratos
                </span>
              </div>
            </summary>
            <div className="border-t border-slate-200 px-6 py-4">
              <ContractsSection
                title="Contratos 2025"
                badgeLabel={`${contracts2025.length} contratos`}
                emptyMessage="No hay contratos del 2025."
                contracts={contracts2025}
                updateAction={updateAction}
                deleteAction={deleteAction}
                bulkDeleteAction={bulkDeleteAction}
                organizerOptions={organizerOptions}
                enableSort
                hideTitle
                hideBadge
                canEditContractNumber={canEditContractNumber}
              />
            </div>
          </details>
        </section>
      ) : null}
    </>
  );
}
