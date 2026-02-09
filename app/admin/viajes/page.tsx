import { SectionHeading } from "@/components/section-heading";
import { Button } from "@/components/ui/button";
import { ThemedSelect } from "@/components/ui/themed-select";
import { getTrips } from "@/lib/db";

import { TripForm } from "./TripForm";
import {
  createTripAction,
  deleteTripAction,
  updateTripAction,
  bulkDeleteTripsAction,
  updateTripStageAction,
} from "./actions";
import TripsPanel from "./TripsPanel";

export const dynamic = "force-dynamic";

type ViajesAdminPageProps = {
  searchParams?: { year?: string; status?: string };
};

export default async function ViajesAdminPage({ searchParams }: ViajesAdminPageProps) {
  const trips = await getTrips();
  const selectedYear = searchParams?.year ?? "all";
  const selectedStatus = searchParams?.status ?? "all";

  const resolveTripYear = (trip: (typeof trips)[number]) => {
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

      <TripsPanel
        trips={trips}
        selectedYear={selectedYear}
        selectedStatus={selectedStatus}
        bulkDeleteAction={bulkDeleteTripsAction}
        updateAction={updateTripAction}
        updateStageAction={updateTripStageAction}
        deleteAction={deleteTripAction}
      />
    </div>
  );
}
