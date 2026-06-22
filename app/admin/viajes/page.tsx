import { SectionHeading } from "@/components/section-heading";
import { Button } from "@/components/ui/button";
import { ThemedSelect } from "@/components/ui/themed-select";
import { getTrips } from "@/lib/db";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

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
  searchParams?: { year?: string; status?: string; limit?: string };
};

const INITIAL_TRIP_LIMIT = 100;
const TRIP_LIMIT_STEP = 100;
const MAX_TRIP_LIMIT = 800;

function parseTripLimit(value?: string) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed < INITIAL_TRIP_LIMIT) {
    return INITIAL_TRIP_LIMIT;
  }
  return Math.min(parsed, MAX_TRIP_LIMIT);
}

function toDateOnly(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getTripYearWhere(selectedYear: string): Prisma.TripWhereInput | null {
  if (selectedYear === "all") return null;
  const year = Number.parseInt(selectedYear, 10);
  if (!Number.isFinite(year)) return null;
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);
  return {
    OR: [
      { departureDate: { startsWith: selectedYear } },
      { returnDate: { startsWith: selectedYear } },
      { createdAt: { gte: start, lt: end } },
    ],
  };
}

function getTripStatusWhere(selectedStatus: string): Prisma.TripWhereInput | null {
  const today = toDateOnly(new Date());
  if (selectedStatus === "upcoming") {
    return {
      OR: [{ returnDate: null }, { returnDate: { gte: today } }],
    };
  }
  if (selectedStatus === "completed") {
    return { returnDate: { lt: today } };
  }
  return null;
}

function combineTripWhere(...filters: Array<Prisma.TripWhereInput | null>) {
  const activeFilters = filters.filter((filter): filter is Prisma.TripWhereInput =>
    Boolean(filter)
  );
  if (activeFilters.length === 0) return undefined;
  if (activeFilters.length === 1) return activeFilters[0];
  return { AND: activeFilters };
}

export default async function ViajesAdminPage({ searchParams }: ViajesAdminPageProps) {
  const selectedYear = searchParams?.year ?? "all";
  const selectedStatus = searchParams?.status ?? "all";
  const tripLimit = parseTripLimit(searchParams?.limit);
  const tripWhere = combineTripWhere(
    getTripYearWhere(selectedYear),
    getTripStatusWhere(selectedStatus)
  );

  const [trips, totalTrips, yearRows] = await Promise.all([
    getTrips({ take: tripLimit, where: tripWhere }),
    prisma.trip.count({ where: tripWhere }),
    prisma.trip.findMany({
      select: {
        departureDate: true,
        returnDate: true,
        createdAt: true,
      },
    }),
  ]);

  const resolveTripYear = (trip: {
    departureDate: string | null;
    returnDate: string | null;
    createdAt: Date | string;
  }) => {
    const base = trip.departureDate || trip.returnDate || trip.createdAt;
    if (!base) return null;
    const date = new Date(base);
    return Number.isNaN(date.getTime()) ? null : date.getFullYear();
  };

  const years = Array.from(
    new Set(
      yearRows
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
        loadedCount={trips.length}
        totalCount={totalTrips}
        nextLimit={Math.min(tripLimit + TRIP_LIMIT_STEP, totalTrips)}
      />
    </div>
  );
}
