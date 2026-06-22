"use client";

import { useCallback, useMemo, useState } from "react";
import type { SyntheticEvent } from "react";

import type { Trip } from "@/lib/db";
import type { CompletedTripMonthGroup } from "@/lib/trips/admin-list";

import TripsSection from "./TripsSection";

type TripsPanelProps = {
  upcomingTrips: Trip[];
  completedMonthGroups: CompletedTripMonthGroup[];
  currentYear: number;
  bulkDeleteAction: (ids: string[]) => Promise<{ ok: boolean; error?: string }>;
  updateAction: (formData: FormData) => void | Promise<void>;
  updateStageAction: (id: string, stage: number) => Promise<void>;
  deleteAction: (formData: FormData) => void | Promise<void>;
};

type TripFilters = {
  destination: string;
  name: string;
  contract: string;
};

const normalize = (value: string) => value.trim().toLowerCase();

const matchesValue = (value: string | null | undefined, query: string) => {
  if (!query) return true;
  if (!value) return false;
  return normalize(value).includes(query);
};

function matchesTripFilters(trip: Trip, filters: TripFilters) {
  const normalizedDestination = normalize(filters.destination);
  const normalizedName = normalize(filters.name);
  const normalizedContract = normalize(filters.contract)
    .replace(/^#/, "")
    .replace(/\s+/g, "");

  const matchesDestination = matchesValue(trip.destination, normalizedDestination);
  const travelerNameMatch = trip.travelers?.some((traveler) =>
    matchesValue(traveler.name, normalizedName)
  );
  const matchesName =
    matchesValue(trip.clientName, normalizedName) || Boolean(travelerNameMatch);
  const contractMatch = trip.travelers?.some((traveler) => {
    if (!normalizedContract) return false;
    const contract = normalize(traveler.contract || "").replace(/\s+/g, "");
    return contract.includes(normalizedContract);
  });
  const matchesContract = !normalizedContract || Boolean(contractMatch);

  return matchesDestination && matchesName && matchesContract;
}

function groupTripsByMonth(trips: Trip[]) {
  const monthFormatter = new Intl.DateTimeFormat("es-MX", {
    month: "long",
    year: "numeric",
  });
  const toLocalDate = (value: string) => new Date(`${value}T00:00:00`);

  return Array.from(
    trips.reduce((map, trip) => {
      const key = trip.departureDate
        ? monthFormatter.format(toLocalDate(trip.departureDate))
        : "Sin fecha asignada";
      const bucket = map.get(key);
      if (bucket) {
        bucket.push(trip);
      } else {
        map.set(key, [trip]);
      }
      return map;
    }, new Map<string, Trip[]>())
  ).map(([label, groupedTrips]) => ({ label, trips: groupedTrips }));
}

function LazyCompletedMonth({
  group,
  filters,
  bulkDeleteAction,
  updateAction,
  updateStageAction,
  deleteAction,
}: {
  group: CompletedTripMonthGroup;
  filters: TripFilters;
  bulkDeleteAction: (ids: string[]) => Promise<{ ok: boolean; error?: string }>;
  updateAction: (formData: FormData) => void | Promise<void>;
  updateStageAction: (id: string, stage: number) => Promise<void>;
  deleteAction: (formData: FormData) => void | Promise<void>;
}) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadTrips = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        year: String(group.year),
        month: String(group.month),
      });
      const response = await fetch(`/api/admin/trips/completed?${params.toString()}`, {
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "No se pudieron cargar los viajes.");
      }
      setTrips(payload.trips ?? []);
      setLoaded(true);
    } catch (requestError) {
      setError((requestError as Error).message || "No se pudieron cargar los viajes.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (event: SyntheticEvent<HTMLDetailsElement>) => {
    if (event.currentTarget.open && !loaded && !loading) {
      void loadTrips();
    }
  };

  const filteredTrips = useMemo(
    () => trips.filter((trip) => matchesTripFilters(trip, filters)),
    [filters, trips]
  );

  return (
    <details
      className="rounded-3xl border border-slate-200 bg-white shadow-sm"
      onToggle={handleToggle}
    >
      <summary className="cursor-pointer list-none px-6 py-4 [&::-webkit-details-marker]:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h4 className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-600">
            {group.label}
          </h4>
          <span className="inline-flex h-8 items-center rounded-full border border-brand-200 px-3 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
            {group.count} viajes
          </span>
        </div>
      </summary>
      <div className="border-t border-slate-200 px-6 py-4">
        {loading && !loaded ? (
          <div className="rounded-3xl border border-dashed border-brand-200 bg-white/60 p-6 text-sm text-slate-600">
            Cargando viajes...
          </div>
        ) : null}
        {error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
            {error}
          </div>
        ) : null}
        {loaded ? (
          <TripsSection
            title={`Viajes completados ${group.label}`}
            emptyMessage="No hay viajes completados para este mes."
            groups={[{ label: group.label, trips: filteredTrips }]}
            bulkDeleteAction={bulkDeleteAction}
            updateAction={updateAction}
            updateStageAction={updateStageAction}
            deleteAction={deleteAction}
            hideTitle
            forceOpenGroups
          />
        ) : null}
      </div>
    </details>
  );
}

export default function TripsPanel({
  upcomingTrips,
  completedMonthGroups,
  currentYear,
  bulkDeleteAction,
  updateAction,
  updateStageAction,
  deleteAction,
}: TripsPanelProps) {
  const [filters, setFilters] = useState<TripFilters>({
    destination: "",
    name: "",
    contract: "",
  });

  const hasFilters = Boolean(
    filters.destination.trim() || filters.name.trim() || filters.contract.trim()
  );

  const filteredUpcomingTrips = useMemo(
    () => upcomingTrips.filter((trip) => matchesTripFilters(trip, filters)),
    [filters, upcomingTrips]
  );

  const completedGroupsByYear = useMemo(() => {
    const map = new Map<number, CompletedTripMonthGroup[]>();
    for (const group of completedMonthGroups) {
      const current = map.get(group.year) ?? [];
      map.set(group.year, [...current, group]);
    }
    return Array.from(map.entries()).sort(([yearA], [yearB]) => yearB - yearA);
  }, [completedMonthGroups]);

  const renderCompletedMonth = useCallback(
    (group: CompletedTripMonthGroup) => (
      <LazyCompletedMonth
        key={group.key}
        group={group}
        filters={filters}
        bulkDeleteAction={bulkDeleteAction}
        updateAction={updateAction}
        updateStageAction={updateStageAction}
        deleteAction={deleteAction}
      />
    ),
    [bulkDeleteAction, deleteAction, filters, updateAction, updateStageAction]
  );

  const renderCompletedYear = (year: number, groups: CompletedTripMonthGroup[]) => (
    <details
      key={year}
      className="rounded-3xl border border-slate-200 bg-white shadow-sm"
    >
      <summary className="cursor-pointer list-none px-6 py-4 [&::-webkit-details-marker]:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="font-display text-base text-brand-950">
              Viajes completados {year}
            </h4>
            <p className="mt-1 text-sm text-slate-600">
              Viajes agrupados por mes.
            </p>
          </div>
          <span className="rounded-full border border-brand-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
            {groups.reduce((sum, group) => sum + group.count, 0)} viajes
          </span>
        </div>
      </summary>
      <div className="space-y-4 border-t border-slate-200 px-6 py-4">
        {groups.map(renderCompletedMonth)}
      </div>
    </details>
  );

  return (
    <>
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-lg text-brand-950">Filtrar viajes</h3>
            <p className="mt-1 text-sm text-slate-600">
              Busca por destino, pasajero o contrato asignado.
            </p>
          </div>
          {hasFilters ? (
            <button
              type="button"
              onClick={() =>
                setFilters({ destination: "", name: "", contract: "" })
              }
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
            >
              Limpiar filtros
            </button>
          ) : null}
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <label className="block space-y-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            Destino
            <input
              type="text"
              value={filters.destination}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  destination: event.target.value,
                }))
              }
              placeholder="Cancun"
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
              placeholder="Cliente o pasajero"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-normal text-slate-900 shadow-sm outline-none transition focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-200"
            />
          </label>
          <label className="block space-y-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            Contrato
            <input
              type="text"
              value={filters.contract}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  contract: event.target.value,
                }))
              }
              placeholder="#2034"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-normal text-slate-900 shadow-sm outline-none transition focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-200"
            />
          </label>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Mostrando {filteredUpcomingTrips.length} de {upcomingTrips.length} viajes próximos cargados.
        </p>
      </section>

      <TripsSection
        title={`Proximos viajes ${currentYear}`}
        emptyMessage="No hay viajes programados todavia."
        groups={groupTripsByMonth(filteredUpcomingTrips)}
        bulkDeleteAction={bulkDeleteAction}
        updateAction={updateAction}
        updateStageAction={updateStageAction}
        deleteAction={deleteAction}
      />

      <section className="space-y-4">
        {completedGroupsByYear.length ? (
          <div className="space-y-6">
            {completedGroupsByYear.map(([year, groups]) =>
              year === currentYear && upcomingTrips.length > 0 ? (
                <div key={year} className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <h4 className="font-display text-base text-brand-950">
                      Viajes completados {year}
                    </h4>
                    <span className="rounded-full border border-brand-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
                      {groups.reduce((sum, group) => sum + group.count, 0)} viajes
                    </span>
                  </div>
                  <div className="space-y-4">{groups.map(renderCompletedMonth)}</div>
                </div>
              ) : (
                renderCompletedYear(year, groups)
              )
            )}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-brand-200 bg-white/60 p-6 text-sm text-slate-600">
            Aun no hay viajes completados.
          </div>
        )}
      </section>
    </>
  );
}
