"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { Trip } from "@/lib/db";
import { Button } from "@/components/ui/button";

import { TripForm } from "./TripForm";

type TripGroup = {
  label: string;
  trips: Trip[];
};

type TripsSectionProps = {
  title: string;
  emptyMessage: string;
  groups: TripGroup[];
  bulkDeleteAction: (ids: string[]) => Promise<{ ok: boolean; error?: string }>;
  updateAction: (formData: FormData) => void | Promise<void>;
  updateStageAction: (id: string, stage: number) => Promise<void>;
  deleteAction: (formData: FormData) => void | Promise<void>;
};

export default function TripsSection({
  title,
  emptyMessage,
  groups,
  bulkDeleteAction,
  updateAction,
  updateStageAction,
  deleteAction,
}: TripsSectionProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [stageOverrides, setStageOverrides] = useState<Record<string, number>>({});
  const [pendingStageId, setPendingStageId] = useState<string | null>(null);

  const allTrips = useMemo(() => groups.flatMap((group) => group.trips), [groups]);
  const allSelected = allTrips.length > 0 && selectedIds.size === allTrips.length;

  const toggleAll = () => {
    setSelectedIds((current) => {
      if (!allTrips.length) return current;
      if (current.size === allTrips.length) return new Set();
      return new Set(allTrips.map((trip) => trip.id));
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
        router.refresh();
      }
    });
  };

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

  const msPerDay = 1000 * 60 * 60 * 24;
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const getTripDates = (trip: Trip) => {
    const departure = trip.departureDate ? toLocalDate(trip.departureDate) : null;
    const returnDate = trip.returnDate ? toLocalDate(trip.returnDate) : null;
    return { departure, returnDate };
  };

  const getDaysUntil = (date: Date) =>
    Math.ceil((date.getTime() - startOfToday.getTime()) / msPerDay);

  const getProgressTone = (daysUntil: number | null, completed: boolean) => {
    if (completed) return "emerald";
    if (daysUntil === null) return "slate";
    if (daysUntil < 7) return "amber";
    if (daysUntil <= 30) return "brand";
    return "slate";
  };

  const getProgressLabel = (daysUntil: number | null, completed: boolean) => {
    if (completed) return "Completado";
    if (daysUntil === null) return "Sin fecha";
    if (daysUntil === 0) return "Sale hoy";
    if (daysUntil === 1) return "Sale en 1 día";
    return `Sale en ${daysUntil} días`;
  };

  const getProgressValue = (daysUntil: number | null, completed: boolean) => {
    if (completed) return 100;
    if (daysUntil === null) return 0;
    const windowDays = 30;
    const clamped = Math.min(Math.max(daysUntil, 0), windowDays);
    return Math.round(((windowDays - clamped) / windowDays) * 100);
  };

  const clampStage = (value: number) => Math.max(0, Math.min(3, Math.round(value)));
  const stageLabels = ["Sección 1", "Sección 2", "Sección 3"];
  const stagePalette = [
    {
      active: "bg-amber-300",
    },
    {
      active: "bg-orange-400",
    },
    {
      active: "bg-emerald-500",
    },
  ];
  const tripBarWidthClass = "w-[220px] max-w-full";

  const resolveStage = (trip: Trip) =>
    clampStage(stageOverrides[trip.id] ?? trip.prepStage ?? 0);

  const handleStageChange = (tripId: string, stage: number) => {
    const nextStage = clampStage(stage);
    setStageOverrides((prev) => ({ ...prev, [tripId]: nextStage }));
    setPendingStageId(tripId);
    startTransition(() => {
      void updateStageAction(tripId, nextStage).then(() => {
        setPendingStageId((current) => (current === tripId ? null : current));
        router.refresh();
      });
    });
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-lg text-brand-950">{title}</h3>
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex h-8 items-center rounded-full border border-brand-200 px-3 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
            {allTrips.length} viajes
          </span>
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

      {allTrips.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-brand-200 bg-white/60 p-6 text-sm text-slate-600">
          {emptyMessage}
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <details
              key={group.label}
              className="rounded-3xl border border-slate-200 bg-white shadow-sm"
            >
              <summary className="cursor-pointer list-none px-6 py-4 [&::-webkit-details-marker]:hidden">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h4 className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-600">
                    {group.label || "Sin fecha asignada"}
                  </h4>
                  <span className="inline-flex h-8 items-center rounded-full border border-brand-200 px-3 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
                    {group.trips.length} viajes
                  </span>
                </div>
              </summary>

              <div className="border-t border-slate-200 px-6 py-4">
                <div className="grid gap-4">
                {group.trips.map((trip) => (
                  <details
                    key={trip.id}
                    id={`trip-${trip.id}`}
                    className="rounded-3xl border border-slate-200 bg-white shadow-sm"
                  >
                    <summary className="cursor-pointer list-none px-6 py-4 [&::-webkit-details-marker]:hidden">
                      {(() => {
                        const { departure, returnDate } = getTripDates(trip);
                        const completed = returnDate
                          ? returnDate < startOfToday
                          : departure
                          ? departure < startOfToday
                          : false;
                        const daysUntil = departure ? getDaysUntil(departure) : null;
                        const tone = getProgressTone(daysUntil, completed);
                        const label = getProgressLabel(daysUntil, completed);
                        const progress = getProgressValue(daysUntil, completed);

                        const toneClasses = {
                          emerald: {
                            bar: "bg-emerald-500",
                            text: "text-emerald-600",
                          },
                          amber: {
                            bar: "bg-amber-500",
                            text: "text-amber-600",
                          },
                          brand: {
                            bar: "bg-brand-500",
                            text: "text-brand-600",
                          },
                          slate: {
                            bar: "bg-slate-400",
                            text: "text-slate-500",
                          },
                        } as const;

                        const toneStyle = toneClasses[tone];
                        const stage = resolveStage(trip);
                        const isStagePending = pendingStageId === trip.id && isPending;

                        return (
                          <div className="space-y-4">
                            <div className="grid items-center gap-4 md:grid-cols-[auto_2fr_1.6fr_1.3fr_0.9fr]">
                              <div className="flex items-start justify-center pt-1">
                                <input
                                  type="checkbox"
                                  aria-label="Seleccionar viaje"
                                  checked={selectedIds.has(trip.id)}
                                  onChange={() => toggleOne(trip.id)}
                                  onClick={(event) => event.stopPropagation()}
                                  className="h-4 w-4 rounded border-brand-300 text-brand-600"
                                />
                              </div>
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
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                <div
                                  className={`h-1 flex-none rounded-full bg-slate-200 ${tripBarWidthClass}`}
                                >
                                  <div
                                    className={`h-1 rounded-full ${toneStyle.bar}`}
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                                  <span
                                    className={`text-[11px] font-semibold ${toneStyle.text}`}
                                  >
                                    {label}
                                  </span>
                                </div>
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

                            <div className="md:grid md:grid-cols-[auto_2fr_1.6fr_1.3fr_0.9fr]">
                              <div className="md:col-start-3">
                                <div
                                  className={`mt-0 translate-y-[-6px] translate-x-[-8px] overflow-hidden rounded-full bg-slate-200 ${tripBarWidthClass}`}
                                >
                                  <div className="grid h-3 grid-cols-3 divide-x divide-white/70">
                                    {stageLabels.map((labelText, index) => {
                                      const isActive = stage >= index + 1;
                                      const palette = stagePalette[index];
                                      const segmentClasses = [
                                        "h-3 transition",
                                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
                                        "disabled:cursor-not-allowed disabled:opacity-60",
                                        isActive
                                          ? palette.active
                                          : "bg-transparent",
                                      ]
                                        .filter(Boolean)
                                        .join(" ");

                                      return (
                                        <button
                                          key={labelText}
                                          type="button"
                                          aria-pressed={isActive}
                                          aria-label={`Marcar ${labelText}`}
                                          disabled={isStagePending}
                                          onClick={(event) => {
                                            event.preventDefault();
                                            event.stopPropagation();
                                            handleStageChange(trip.id, index + 1);
                                          }}
                                          className={segmentClasses}
                                        />
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
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
                              action={updateAction}
                              deleteAction={deleteAction}
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
            </details>
          ))}
        </div>
      )}
    </section>
  );
}
