"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { SyntheticEvent } from "react";

import type { Contract } from "@/lib/db";
import type { AdminRoleForContracts } from "@/lib/contracts/edit-policy";

import ContractsSection from "./ContractsSection";

type ContractsPanelProps = {
  contracts: Contract[];
  updateAction: (
    prevState: { submittedAt: number; error?: string; field?: "contractNumber" | "general" },
    formData: FormData
  ) => Promise<{ submittedAt: number; error?: string; field?: "contractNumber" | "general" }>;
  deleteAction?: (formData: FormData) => void;
  bulkDeleteAction: (ids: string[]) => Promise<{ ok: boolean; error?: string }>;
  organizerOptions?: { value: string; label: string }[];
  canEditContractNumber?: boolean;
  currentAdminRole: AdminRoleForContracts;
  sectionCounts: Record<ContractSectionKey, ContractSectionStats>;
  currentLimits: Record<ContractSectionKey, number>;
  legacy2025TotalCount: number;
  legacy2025InitialLimit: number;
  legacy2025LimitStep: number;
};

type ContractSectionKey = "approved" | "pending" | "canceled";

type ContractSectionStats = {
  loaded: number;
  total: number;
  nextLimit: number;
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
  currentAdminRole,
  sectionCounts,
  currentLimits,
  legacy2025TotalCount,
  legacy2025InitialLimit,
  legacy2025LimitStep,
}: ContractsPanelProps) {
  const [filters, setFilters] = useState({
    id: "",
    name: "",
    contact: "",
  });
  const [legacy2025Contracts, setLegacy2025Contracts] = useState<Contract[]>([]);
  const [legacy2025Loaded, setLegacy2025Loaded] = useState(false);
  const [legacy2025Loading, setLegacy2025Loading] = useState(false);
  const [legacy2025Error, setLegacy2025Error] = useState("");
  const [legacy2025LoadedCount, setLegacy2025LoadedCount] = useState(0);
  const [legacy2025NextLimit, setLegacy2025NextLimit] = useState(legacy2025InitialLimit);
  const [legacy2025ResolvedTotal, setLegacy2025ResolvedTotal] = useState(
    legacy2025TotalCount
  );
  const [serverSearchContracts, setServerSearchContracts] = useState<Contract[]>([]);
  const [serverSearchLoading, setServerSearchLoading] = useState(false);
  const [serverSearchError, setServerSearchError] = useState("");

  const normalizedId = normalize(filters.id).replace(/^#/, "");
  const normalizedName = normalize(filters.name);
  const normalizedContact = normalize(filters.contact).replace(/\s+/g, "");
  const hasFilters = Boolean(normalizedId || normalizedName || normalizedContact);
  const shouldSearchServer =
    normalizedId.length >= 3 || normalizedName.length >= 3 || normalizedContact.length >= 3;
  const updateFilters = (updates: Partial<typeof filters>) => {
    const nextFilters = { ...filters, ...updates };
    const nextNormalizedId = normalize(nextFilters.id).replace(/^#/, "");
    const nextNormalizedName = normalize(nextFilters.name);
    const nextNormalizedContact = normalize(nextFilters.contact).replace(/\s+/g, "");
    const nextShouldSearchServer =
      nextNormalizedId.length >= 3 ||
      nextNormalizedName.length >= 3 ||
      nextNormalizedContact.length >= 3;

    if (!nextShouldSearchServer) {
      setServerSearchContracts([]);
      setServerSearchError("");
      setServerSearchLoading(false);
    }

    setFilters(nextFilters);
  };

  useEffect(() => {
    if (!shouldSearchServer) return;

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams();
      if (normalizedId.length >= 3) params.set("contractId", normalizedId);
      if (normalizedName.length >= 3) params.set("name", normalizedName);
      if (normalizedContact.length >= 3) params.set("contact", normalizedContact);

      setServerSearchLoading(true);
      setServerSearchError("");
      fetch(`/api/admin/contracts/search?${params.toString()}`, {
        cache: "no-store",
        signal: controller.signal,
      })
        .then(async (response) => {
          const payload = await response.json();
          if (!response.ok) {
            throw new Error(payload?.error || "No se pudo buscar el contrato.");
          }
          setServerSearchContracts(payload.contracts ?? []);
        })
        .catch((error) => {
          if ((error as Error).name === "AbortError") return;
          setServerSearchContracts([]);
          setServerSearchError((error as Error).message || "No se pudo buscar el contrato.");
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setServerSearchLoading(false);
          }
        });
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [normalizedContact, normalizedId, normalizedName, shouldSearchServer]);

  const getFilteredContracts = useCallback((items: Contract[]) => {
    if (!hasFilters) return items;
    return items.filter((contract) => {
      const matchesId =
        matchesValue(contract.contractNumber, normalizedId) ||
        matchesValue(contract.id, normalizedId);

      const matchesName =
        matchesValue(contract.title, normalizedName) ||
        matchesValue(contract.clientName, normalizedName) ||
        matchesValue(contract.destination, normalizedName);

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
  }, [hasFilters, normalizedContact, normalizedId, normalizedName]);

  const filteredContracts = useMemo(
    () => {
      const mergedContracts = [...contracts];
      const existingIds = new Set(contracts.map((contract) => contract.id));
      for (const contract of serverSearchContracts) {
        if (!existingIds.has(contract.id)) {
          mergedContracts.push(contract);
        }
      }
      return getFilteredContracts(mergedContracts);
    },
    [contracts, getFilteredContracts, serverSearchContracts]
  );
  const filteredLegacy2025Contracts = useMemo(
    () => getFilteredContracts(legacy2025Contracts),
    [legacy2025Contracts, getFilteredContracts]
  );

  const approvedContracts = filteredContracts.filter(
    (contract) => contract.status === "paid" || contract.status === "signed"
  );
  const pendingContracts = filteredContracts.filter(
    (contract) => contract.status === "pending"
  );
  const canceledContracts = filteredContracts.filter(
    (contract) => contract.status === "canceled"
  );

  const getSectionLimitHref = (section: ContractSectionKey, nextLimit: number) => {
    const params = new URLSearchParams({
      approvedLimit: String(currentLimits.approved),
      pendingLimit: String(currentLimits.pending),
      canceledLimit: String(currentLimits.canceled),
    });
    params.set(`${section}Limit`, String(nextLimit));
    return `/admin/contratos?${params.toString()}`;
  };

  const renderSectionLoadMore = (
    section: ContractSectionKey,
    visibleCount: number,
    label: string
  ) => {
    const stats = sectionCounts[section];
    if (stats.total === 0) return null;
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        {stats.total > stats.loaded ? (
          <Link
            href={getSectionLimitHref(section, stats.nextLimit)}
            className="rounded-full border border-brand-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700 transition hover:border-brand-300 hover:text-brand-900"
          >
            Cargar más contratos
          </Link>
        ) : null}
        <p className="text-xs text-slate-500">
          Mostrando {visibleCount} de {stats.loaded} {label} cargados.
          {stats.total > stats.loaded
            ? ` ${stats.total - stats.loaded} pendientes por cargar.`
            : ""}
        </p>
      </div>
    );
  };

  const loadLegacy2025Contracts = async (limit = legacy2025InitialLimit) => {
    setLegacy2025Loading(true);
    setLegacy2025Error("");
    try {
      const response = await fetch(`/api/admin/contracts/2025?limit=${limit}`, {
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "No se pudieron cargar los contratos 2025.");
      }
      setLegacy2025Contracts(payload.contracts ?? []);
      setLegacy2025LoadedCount(payload.loadedCount ?? 0);
      setLegacy2025ResolvedTotal(payload.totalCount ?? legacy2025TotalCount);
      setLegacy2025NextLimit(payload.nextLimit ?? limit + legacy2025LimitStep);
      setLegacy2025Loaded(true);
    } catch (error) {
      setLegacy2025Error(
        (error as Error).message || "No se pudieron cargar los contratos 2025."
      );
    } finally {
      setLegacy2025Loading(false);
    }
  };

  const handleLegacy2025Toggle = (event: SyntheticEvent<HTMLDetailsElement>) => {
    if (event.currentTarget.open && !legacy2025Loaded && !legacy2025Loading) {
      void loadLegacy2025Contracts();
    }
  };

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
              onClick={() => {
                setFilters({ id: "", name: "", contact: "" });
                setServerSearchContracts([]);
                setServerSearchError("");
                setServerSearchLoading(false);
              }}
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
              onChange={(event) => {
                updateFilters({ id: event.target.value });
              }}
              placeholder="#2034"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-normal text-slate-900 shadow-sm outline-none transition focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-200"
            />
          </label>
          <label className="block space-y-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            Nombre
            <input
              type="text"
              value={filters.name}
              onChange={(event) => updateFilters({ name: event.target.value })}
              placeholder="Cliente o ciudad"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-normal text-slate-900 shadow-sm outline-none transition focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-200"
            />
          </label>
          <label className="block space-y-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            Contacto
            <input
              type="text"
              value={filters.contact}
              onChange={(event) => updateFilters({ contact: event.target.value })}
              placeholder="Teléfono o email"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-normal text-slate-900 shadow-sm outline-none transition focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-200"
            />
          </label>
        </div>
        {shouldSearchServer ? (
          <div className="mt-4 text-xs text-slate-500">
            {serverSearchLoading ? (
              <span className="text-sm font-semibold text-brand-600">
                Buscando contratos en la base de datos...
              </span>
            ) : null}
            {!serverSearchLoading && serverSearchError ? (
              <span className="text-rose-600">{serverSearchError}</span>
            ) : null}
            {!serverSearchLoading &&
            !serverSearchError &&
            serverSearchContracts.length === 0 ? (
              "Si hay coincidencias fuera de los contratos cargados, aparecerán aquí al terminar la búsqueda."
            ) : null}
          </div>
        ) : null}
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
        currentAdminRole={currentAdminRole}
      />
      {renderSectionLoadMore("pending", pendingContracts.length, "contratos pendientes")}

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
        currentAdminRole={currentAdminRole}
      />
      {renderSectionLoadMore("approved", approvedContracts.length, "contratos aprobados")}

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
        currentAdminRole={currentAdminRole}
      />
      {renderSectionLoadMore("canceled", canceledContracts.length, "contratos cancelados")}

      {legacy2025TotalCount > 0 ? (
        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <details className="group" onToggle={handleLegacy2025Toggle}>
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
                  {legacy2025ResolvedTotal} contratos
                </span>
              </div>
            </summary>
            <div className="border-t border-slate-200 px-6 py-4">
              {legacy2025Loading && !legacy2025Loaded ? (
                <div className="rounded-3xl border border-dashed border-brand-200 bg-white/60 p-6 text-sm text-slate-600">
                  Cargando contratos 2025...
                </div>
              ) : null}
              {legacy2025Error ? (
                <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
                  {legacy2025Error}
                </div>
              ) : null}
              {legacy2025Loaded ? (
                <div className="space-y-4">
                  <ContractsSection
                    title="Contratos 2025"
                    badgeLabel={`${legacy2025LoadedCount} contratos`}
                    emptyMessage="No hay contratos del 2025."
                    contracts={filteredLegacy2025Contracts}
                    updateAction={updateAction}
                    deleteAction={deleteAction}
                    bulkDeleteAction={bulkDeleteAction}
                    organizerOptions={organizerOptions}
                    enableSort
                    hideTitle
                    hideBadge
                    canEditContractNumber={canEditContractNumber}
                    currentAdminRole={currentAdminRole}
                  />
                  <div className="flex flex-col items-center gap-3 text-center">
                    {legacy2025ResolvedTotal > legacy2025LoadedCount ? (
                      <button
                        type="button"
                        onClick={() => void loadLegacy2025Contracts(legacy2025NextLimit)}
                        disabled={legacy2025Loading}
                        className="rounded-full border border-brand-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700 transition hover:border-brand-300 hover:text-brand-900 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {legacy2025Loading ? "Cargando..." : "Cargar más contratos"}
                      </button>
                    ) : null}
                    <p className="text-xs text-slate-500">
                      Mostrando {filteredLegacy2025Contracts.length} de{" "}
                      {legacy2025LoadedCount} contratos 2025 cargados.
                      {legacy2025ResolvedTotal > legacy2025LoadedCount
                        ? ` ${legacy2025ResolvedTotal - legacy2025LoadedCount} pendientes por cargar.`
                        : ""}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </details>
        </section>
      ) : null}
    </>
  );
}
