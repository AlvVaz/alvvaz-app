import { SectionHeading } from "@/components/section-heading";
import { getTrips } from "@/lib/db";
import type { Trip } from "@/lib/db";

import { TripForm } from "./TripForm";
import { createTripAction, deleteTripAction, updateTripAction } from "./actions";

export default async function ViajesAdminPage() {
  const trips = await getTrips();
  const monthFormatter = new Intl.DateTimeFormat("es-MX", {
    month: "long",
    year: "numeric",
  });
  const dayFormatter = new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
  });

  const toLocalDate = (value: string) => new Date(`${value}T00:00:00`);
  const formatDay = (value: string | null) =>
    value ? dayFormatter.format(toLocalDate(value)) : "Sin fecha";
  const formatRange = (departure: string | null, returnDate: string | null) => {
    if (departure && returnDate) {
      return `${formatDay(departure)} → ${formatDay(returnDate)}`;
    }
    if (departure) {
      return `${formatDay(departure)} → Sin regreso`;
    }
    if (returnDate) {
      return `Salida sin fecha → ${formatDay(returnDate)}`;
    }
    return "Sin fechas";
  };

  const groupedTrips = Array.from(
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
    }, new Map<string, Trip[]>()),
  );

  return (
    <div className="space-y-10">
      <SectionHeading
        title="Viajes"
        subtitle="Registra salidas próximas, viajeros y responsables del itinerario."
        kicker="Admin"
      />

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="font-display text-lg text-brand-950">Nuevo viaje</h3>
        <p className="mt-1 text-sm text-slate-600">
          Agrega destino, hotel, asesor y lista de viajeros.
        </p>
        <div className="mt-4">
          <TripForm action={createTripAction} submitLabel="Guardar viaje" />
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="font-display text-lg text-brand-950">Próximos viajes</h3>
        {trips.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-brand-200 bg-white/60 p-6 text-sm text-slate-600">
            No hay viajes programados todavía.
          </div>
        ) : (
          <div className="space-y-6">
            {groupedTrips.map(([monthLabel, monthTrips]) => (
              <div key={monthLabel} className="space-y-4">
                <div className="flex items-center gap-3">
                  <h4 className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-600">
                    {monthLabel}
                  </h4>
                  <span className="h-px flex-1 bg-slate-200" />
                </div>

                <div className="grid gap-4">
                  {monthTrips.map((trip) => (
                    <details
                      key={trip.id}
                      className="rounded-3xl border border-slate-200 bg-white shadow-sm"
                    >
                      <summary className="cursor-pointer list-none px-6 py-4 [&::-webkit-details-marker]:hidden">
                        <div className="grid items-center gap-4 md:grid-cols-[2fr_1.6fr_1.3fr_0.9fr]">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                              Destino
                            </p>
                            <p className="font-display text-base text-brand-950">
                              {trip.destination}
                            </p>
                            <p className="text-xs text-slate-500">
                              {trip.hotel || "Hotel por confirmar"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                              Fechas
                            </p>
                            <p className="text-sm text-slate-700">
                              {formatRange(trip.departureDate, trip.returnDate)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                              Cliente
                            </p>
                            <p className="text-sm text-slate-700">
                              {trip.clientName || "Sin cliente"}
                            </p>
                            <p className="text-xs text-slate-500">
                              {trip.organizer || "Sin asignar"}
                            </p>
                          </div>
                          <div className="text-right md:text-left">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                              Pasajeros
                            </p>
                            <p className="text-sm text-slate-700">
                              {trip.passengerCount || trip.travelers.length} personas
                            </p>
                            <span className="mt-2 inline-flex rounded-full border border-brand-200 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-700">
                              Ver detalles
                            </span>
                          </div>
                        </div>
                      </summary>

                      <div className="border-t border-slate-200 px-6 py-4">
                        <div className="grid gap-4 text-sm md:grid-cols-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                              Cliente
                            </p>
                            <p className="text-slate-700">{trip.clientName || "Sin cliente"}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                              Organizó
                            </p>
                            <p className="text-slate-700">
                              {trip.organizer || "Sin asignar"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                              Proveedor
                            </p>
                            <p className="text-slate-700">{trip.supplier || "Sin proveedor"}</p>
                          </div>
                          <div className="md:col-span-1">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                              Pasajeros
                            </p>
                            <p className="text-slate-700">
                              {trip.passengerCount || trip.travelers.length} personas
                            </p>
                          </div>
                          <div className="md:col-span-2">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                              Contactos rápidos
                            </p>
                            <div className="space-y-1 text-slate-600">
                              {trip.travelers.length === 0 ? (
                                <p>Sin pasajeros</p>
                              ) : (
                                trip.travelers.slice(0, 3).map((traveler, index) => (
                                  <p key={`${traveler.name}-${index}`}>
                                    {traveler.name || "Sin nombre"} ·{" "}
                                    {traveler.phone || "Sin teléfono"}
                                  </p>
                                ))
                              )}
                            </div>
                          </div>
                        </div>

                        <details className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <summary className="cursor-pointer text-sm font-semibold text-brand-900">
                            Editar viaje
                          </summary>
                          <div className="mt-4">
                            <TripForm
                              action={updateTripAction}
                              deleteAction={deleteTripAction}
                              initialTrip={trip}
                              submitLabel="Guardar cambios"
                            />
                          </div>
                        </details>
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
