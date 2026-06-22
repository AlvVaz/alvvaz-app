import { unstable_cache } from "next/cache";

import { SectionHeading } from "@/components/section-heading";
import { ADMIN_TRIPS_CACHE_TAG } from "@/lib/admin-cache-tags";
import {
  buildCompletedTripMonthGroups,
  getCompletedTripWhere,
  getTripYearWhere,
  getUpcomingTripWhere,
} from "@/lib/trips/admin-list";
import { getTrips } from "@/lib/db";
import { prisma } from "@/lib/prisma";

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

const ADMIN_TRIPS_CACHE_SECONDS = 30;

const getCachedTripsPageData = unstable_cache(
  async (currentYear: number) => {
    const upcomingCurrentYearWhere = {
      AND: [getTripYearWhere(currentYear), getUpcomingTripWhere()],
    };

    const [upcomingTrips, completedRows] = await Promise.all([
      getTrips({ where: upcomingCurrentYearWhere }),
      prisma.trip.findMany({
        where: getCompletedTripWhere(),
        select: {
          id: true,
          departureDate: true,
          returnDate: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      upcomingTrips,
      completedMonthGroups: buildCompletedTripMonthGroups(completedRows),
    };
  },
  ["admin-trips-page-data"],
  {
    revalidate: ADMIN_TRIPS_CACHE_SECONDS,
    tags: [ADMIN_TRIPS_CACHE_TAG],
  }
);

export default async function ViajesAdminPage() {
  const currentYear = new Date().getFullYear();
  const { upcomingTrips, completedMonthGroups } = await getCachedTripsPageData(
    currentYear
  );

  return (
    <div className="space-y-10">
      <SectionHeading
        title="Viajes"
        subtitle="Registra salidas próximas, viajeros y responsables del itinerario."
        kicker="Admin"
      />

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
        upcomingTrips={upcomingTrips}
        completedMonthGroups={completedMonthGroups}
        currentYear={currentYear}
        bulkDeleteAction={bulkDeleteTripsAction}
        updateAction={updateTripAction}
        updateStageAction={updateTripStageAction}
        deleteAction={deleteTripAction}
      />
    </div>
  );
}
