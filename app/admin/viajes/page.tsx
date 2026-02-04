import { SectionHeading } from "@/components/section-heading";
import { Button } from "@/components/ui/button";
import { ThemedSelect } from "@/components/ui/themed-select";
import { getTrips } from "@/lib/db";
import type { Trip } from "@/lib/db";

import { TripForm } from "./TripForm";
import {
  createTripAction,
  deleteTripAction,
  updateTripAction,
  bulkDeleteTripsAction,
  updateTripStageAction,
} from "./actions";
import TripsSection from "./TripsSection";

export const dynamic = "force-dynamic";

type ViajesAdminPageProps = {
  searchParams?: { year?: string; status?: string };
};

export default async function ViajesAdminPage({ searchParams }: ViajesAdminPageProps) {
  const trips = await getTrips();
  const selectedYear = searchParams?.year ?? "all";
  const selectedStatus = searchParams?.status ?? "all";

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const currentYear = now.getFullYear();
  const collapsedYear = 2025;

  const resolveTripYear = (trip: Trip) => {
    const base = trip.departureDate || trip.returnDate || trip.createdAt;
    if (!base) return null;
    const date = new Date(base);
    return Number.isNaN(date.getTime()) ? null : date.getFullYear();
  };

  const years = Array.from(
    new Set(
      trips
        .map(resolveTripYear)
        .filter((value): value is number => typeof value === "number")
    )
  ).sort((a, b) => b - a);

  const matchesYear = (trip: Trip) => {
    if (selectedYear === "all") return true;
    const year = resolveTripYear(trip);
    return year?.toString() === selectedYear;
  };

  const isUpcoming = (trip: Trip) => {
    if (!trip.departureDate) return true;
    const departure = new Date(trip.departureDate);
    return departure >= startOfToday;
  };

  const filteredTrips = trips.filter(matchesYear);
  const upcomingTrips = filteredTrips.filter((trip) => isUpcoming(trip));
  const completedTrips = filteredTrips.filter((trip) => !isUpcoming(trip));

  const monthFormatter = new Intl.DateTimeFormat("es-MX", {
    month: "long",
    year: "numeric",
  });
  const toLocalDate = (value: string) => new Date(`${value}T00:00:00`);
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
    ).map(([label, groupTrips]) => ({ label, trips: groupTrips }));

  const upcomingGroups = groupTrips(upcomingTrips);
  const completedGroups = groupTrips(completedTrips);

  const showUpcoming = selectedStatus === "all" || selectedStatus === "upcoming";
  const showCompleted = selectedStatus === "all" || selectedStatus === "completed";
  const groupByYear = selectedYear === "all";

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
          const yearGroups = groupTrips(tripsForYear);
          const section = (
            <TripsSection
              title={`${title} ${year}`}
              emptyMessage={emptyMessage}
              groups={yearGroups}
              bulkDeleteAction={bulkDeleteTripsAction}
              updateAction={updateTripAction}
              updateStageAction={updateTripStageAction}
              deleteAction={deleteTripAction}
            />
          );

          if (year === collapsedYear && year !== currentYear) {
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
                  <div className="border-t border-slate-200 px-6 py-6">
                    {section}
                  </div>
                </details>
              </section>
            );
          }

          return <div key={`${title}-${year}`}>{section}</div>;
        })}
      </div>
    );
  };

  return (
    <div className="space-y-10">
      <SectionHeading
        title="Viajes"
        subtitle="Registra salidas próximas, viajeros y responsables del itinerario."
        kicker="Admin"
      />

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <form method="get" className="flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
              Año
            </label>
            <ThemedSelect
              name="year"
              defaultValue={selectedYear}
              options={[
                { value: "all", label: "Todos" },
                ...years.map((year) => ({
                  value: year.toString(),
                  label: year.toString(),
                })),
              ]}
              className="w-48"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
              Estado
            </label>
            <ThemedSelect
              name="status"
              defaultValue={selectedStatus}
              options={[
                { value: "all", label: "Todos" },
                { value: "upcoming", label: "Próximos" },
                { value: "completed", label: "Completados" },
              ]}
              className="w-48"
            />
          </div>
          <Button type="submit">Aplicar filtros</Button>
        </form>
      </section>

      {false ? (
        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <details className="group">
            <summary className="cursor-pointer list-none px-6 py-4 [&::-webkit-details-marker]:hidden">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg text-brand-950">Nuevo viaje</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Agrega destino, hotel, asesor y lista de viajeros.
                  </p>
                </div>
                <span className="rounded-full border border-brand-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
                  Agregar
                </span>
              </div>
            </summary>
            <div className="border-t border-slate-200 px-6 py-4">
              <TripForm action={createTripAction} submitLabel="Guardar viaje" />
            </div>
          </details>
        </section>
      ) : null}

      {showUpcoming &&
        (groupByYear ? (
          renderYearSections(
            upcomingTrips,
            "Próximos viajes",
            "No hay viajes programados todavía."
          )
        ) : (
          <TripsSection
            title="Próximos viajes"
            emptyMessage="No hay viajes programados todavía."
            groups={upcomingGroups}
            bulkDeleteAction={bulkDeleteTripsAction}
            updateAction={updateTripAction}
            updateStageAction={updateTripStageAction}
            deleteAction={deleteTripAction}
          />
        ))}

      {showCompleted &&
        (groupByYear ? (
          renderYearSections(
            completedTrips,
            "Viajes completados",
            "Aún no hay viajes completados para este filtro."
          )
        ) : (
          <TripsSection
            title="Viajes completados"
            emptyMessage="Aún no hay viajes completados para este filtro."
            groups={completedGroups}
            bulkDeleteAction={bulkDeleteTripsAction}
            updateAction={updateTripAction}
            updateStageAction={updateTripStageAction}
            deleteAction={deleteTripAction}
          />
        ))}
    </div>
  );
}
