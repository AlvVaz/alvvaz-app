"use client";

import { useState } from "react";

import type { Trip } from "@/lib/db";

import TripsSection from "./TripsSection";

type TripsPanelProps = {
  trips: Trip[];
  selectedYear: string;
  selectedStatus: string;
  bulkDeleteAction: (ids: string[]) => Promise<{ ok: boolean; error?: string }>;
  updateAction: (formData: FormData) => void | Promise<void>;
  updateStageAction: (id: string, stage: number) => Promise<void>;
  deleteAction: (formData: FormData) => void | Promise<void>;
};

const normalize = (value: string) => value.trim().toLowerCase();

const matchesValue = (value: string | null | undefined, query: string) => {
  if (!query) return true;
  if (!value) return false;
  return normalize(value).includes(query);
};

export default function TripsPanel({
  trips,
  selectedYear,
  selectedStatus,
  bulkDeleteAction,
  updateAction,
  updateStageAction,
  deleteAction,
}: TripsPanelProps) {
  const [filters, setFilters] = useState({
    destination: "",
    name: "",
    contract: "",
  });

  const normalizedDestination = normalize(filters.destination);
  const normalizedName = normalize(filters.name);
  const normalizedContract = normalize(filters.contract)
    .replace(/^#/, "")
    .replace(/\s+/g, "");
  const hasFilters = Boolean(
    normalizedDestination || normalizedName || normalizedContract
  );

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const currentYear = now.getFullYear();
  const toLocalDate = (value: string) => new Date(`${value}T00:00:00`);

  const resolveTripYear = (trip: Trip) => {
    const base = trip.departureDate || trip.returnDate || trip.createdAt;
    if (!base) return null;
    const date = new Date(base);
    return Number.isNaN(date.getTime()) ? null : date.getFullYear();
  };

  const matchesYear = (trip: Trip) => {
    if (selectedYear === "all") return true;
    const year = resolveTripYear(trip);
    return year?.toString() === selectedYear;
  };

  const isUpcoming = (trip: Trip) => {
    if (trip.returnDate) {
      const returnDate = toLocalDate(trip.returnDate);
      return returnDate >= startOfToday;
    }
    return true;
  };

  const matchesFilters = (trip: Trip) => {
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
  };

  const tripsByYear = trips.filter(matchesYear);
  const filteredTrips = hasFilters
    ? tripsByYear.filter(matchesFilters)
    : tripsByYear;
  const upcomingTrips = filteredTrips.filter((trip) => isUpcoming(trip));
  const completedTrips = filteredTrips.filter((trip) => !isUpcoming(trip));

  const monthFormatter = new Intl.DateTimeFormat("es-MX", {
    month: "long",
    year: "numeric",
  });

  const groupTrips = (items: Trip[]) =>
    Array.from(
      items.reduce((map, trip) => {
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

  const groupTripsByYear = (items: Trip[]) =>
    Array.from(
      items.reduce((map, trip) => {
        const year = resolveTripYear(trip);
        if (!year) return map;
        const bucket = map.get(year);
        if (bucket) {
          bucket.push(trip);
        } else {
          map.set(year, [trip]);
        }
        return map;
      }, new Map<number, Trip[]>())
    ).sort(([a], [b]) => b - a);

  const compareYearsByPriority = (a: number, b: number) => {
    const getPriority = (year: number) => {
      if (year === currentYear) return 0;
      if (year > currentYear) return 1;
      return 2;
    };
    const priorityDiff = getPriority(a) - getPriority(b);
    if (priorityDiff !== 0) return priorityDiff;
    return a > currentYear && b > currentYear ? a - b : b - a;
  };

  const getPrioritizedYears = (...items: Trip[][]) =>
    Array.from(
      new Set(
        items.flatMap((tripsForStatus) =>
          tripsForStatus
            .map(resolveTripYear)
            .filter((year): year is number => Boolean(year))
        )
      )
    ).sort(compareYearsByPriority);

  const shouldCollapseCompletedYear = (year: number) => year < currentYear;

  const renderSingleYearSection = (
    tripsForYear: Trip[],
    year: number,
    title: string,
    emptyMessage: string,
    collapsed = false
  ) => {
    const yearGroups = groupTrips(tripsForYear);
    const section = (
      <TripsSection
        title={`${title} ${year}`}
        emptyMessage={emptyMessage}
        groups={yearGroups}
        bulkDeleteAction={bulkDeleteAction}
        updateAction={updateAction}
        updateStageAction={updateStageAction}
        deleteAction={deleteAction}
      />
    );

    if (collapsed) {
      return (
        <section
          key={`${title}-${year}`}
          className="rounded-3xl border border-slate-200 bg-white shadow-sm"
        >
          <details className="group">
            <summary className="cursor-pointer list-none px-6 py-4 [&::-webkit-details-marker]:hidden">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg text-brand-950">
                    {title} {year}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Viajes agrupados por mes.
                  </p>
                </div>
                <span className="rounded-full border border-brand-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
                  {tripsForYear.length} viajes
                </span>
              </div>
            </summary>
            <div className="border-t border-slate-200 px-6 py-6">{section}</div>
          </details>
        </section>
      );
    }

    return <div key={`${title}-${year}`}>{section}</div>;
  };

  const renderYearSections = (
    items: Trip[],
    title: string,
    emptyMessage: string
  ) => {
    if (!items.length) {
      return (
        <div className="rounded-3xl border border-dashed border-brand-200 bg-white/60 p-6 text-sm text-slate-600">
          {emptyMessage}
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {groupTripsByYear(items).map(([year, tripsForYear]) => {
          return renderSingleYearSection(
            tripsForYear,
            year,
            title,
            emptyMessage,
            title === "Viajes completados" && shouldCollapseCompletedYear(year)
          );
        })}
      </div>
    );
  };

  const renderPrioritizedYearSections = () => {
    if (!filteredTrips.length) {
      return (
        <div className="rounded-3xl border border-dashed border-brand-200 bg-white/60 p-6 text-sm text-slate-600">
          No hay viajes para este filtro.
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {getPrioritizedYears(upcomingTrips, completedTrips).flatMap((year) => {
          const upcomingForYear = upcomingTrips.filter(
            (trip) => resolveTripYear(trip) === year
          );
          const completedForYear = completedTrips.filter(
            (trip) => resolveTripYear(trip) === year
          );

          return [
            upcomingForYear.length
              ? renderSingleYearSection(
                  upcomingForYear,
                  year,
                  "Proximos viajes",
                  "No hay viajes programados todavia."
                )
              : null,
            completedForYear.length
              ? renderSingleYearSection(
                  completedForYear,
                  year,
                  "Viajes completados",
                  "Aun no hay viajes completados para este filtro.",
                  shouldCollapseCompletedYear(year)
                )
              : null,
          ].filter(Boolean);
        })}
      </div>
    );
  };

  const showUpcoming = selectedStatus === "all" || selectedStatus === "upcoming";
  const showCompleted = selectedStatus === "all" || selectedStatus === "completed";
  const groupByYear = selectedYear === "all";

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
          Mostrando {filteredTrips.length} de {tripsByYear.length} viajes.
        </p>
      </section>

      {groupByYear && showUpcoming && showCompleted ? (
        renderPrioritizedYearSections()
      ) : (
        <>
          {showUpcoming &&
            (groupByYear ? (
              renderYearSections(
                upcomingTrips,
                "Proximos viajes",
                "No hay viajes programados todavia."
              )
            ) : (
              <TripsSection
                title="Proximos viajes"
                emptyMessage="No hay viajes programados todavia."
                groups={groupTrips(upcomingTrips)}
                bulkDeleteAction={bulkDeleteAction}
                updateAction={updateAction}
                updateStageAction={updateStageAction}
                deleteAction={deleteAction}
              />
            ))}

          {showCompleted &&
            (groupByYear ? (
              renderYearSections(
                completedTrips,
                "Viajes completados",
                "Aun no hay viajes completados para este filtro."
              )
            ) : (
              <TripsSection
                title="Viajes completados"
                emptyMessage="Aun no hay viajes completados para este filtro."
                groups={groupTrips(completedTrips)}
                bulkDeleteAction={bulkDeleteAction}
                updateAction={updateAction}
                updateStageAction={updateStageAction}
                deleteAction={deleteAction}
              />
            ))}
        </>
      )}
    </>
  );
}
