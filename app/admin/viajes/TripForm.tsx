"use client";

import type { FormEvent, MouseEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { Trip, TripTraveler } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";

type TripFormProps = {
  action: (formData: FormData) => void;
  deleteAction?: (formData: FormData) => void;
  initialTrip?: Trip;
  submitLabel: string;
};

const emptyTraveler: TripTraveler = { name: "", phone: "", contract: "" };

export function TripForm({ action, deleteAction, initialTrip, submitLabel }: TripFormProps) {
  const { confirm, dialog } = useConfirmDialog();
  const [travelers, setTravelers] = useState<TripTraveler[]>(
    initialTrip?.travelers?.length ? initialTrip.travelers : [emptyTraveler]
  );

  const travelersPayload = useMemo(() => JSON.stringify(travelers), [travelers]);
  const travelerCount = travelers.filter(
    (traveler) => traveler.name || traveler.phone || traveler.contract
  ).length;
  const [passengerCountValue, setPassengerCountValue] = useState(
    initialTrip?.passengerCount !== undefined
      ? String(initialTrip.passengerCount)
      : String(travelerCount)
  );
  const lastTravelerCount = useRef(travelerCount);

  useEffect(() => {
    if (passengerCountValue === String(lastTravelerCount.current)) {
      setPassengerCountValue(String(travelerCount));
    }
    lastTravelerCount.current = travelerCount;
  }, [travelerCount, passengerCountValue]);

  const handleTravelerChange = (index: number, field: keyof TripTraveler, value: string) => {
    setTravelers((prev) =>
      prev.map((traveler, currentIndex) =>
        currentIndex === index ? { ...traveler, [field]: value } : traveler
      )
    );
  };

  const handleAddTraveler = () => {
    setTravelers((prev) => [...prev, { ...emptyTraveler }]);
  };

  const handleRemoveTraveler = (index: number) => {
    setTravelers((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
  };

  const handleReset = (event: FormEvent<HTMLFormElement>) => {
    if (!initialTrip) {
      setTravelers([emptyTraveler]);
      return;
    }

    setTravelers(initialTrip.travelers?.length ? initialTrip.travelers : [emptyTraveler]);
  };

  const handleDeleteClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const submitter = event.currentTarget;
    const label = initialTrip?.destination
      ? `el viaje a ${initialTrip.destination}`
      : "este viaje";
    confirm(`Seguro que quieres eliminar ${label}?`, () => {
      submitter.form?.requestSubmit(submitter);
    });
  };

  return (
    <form action={action} onReset={handleReset} className="grid gap-4 md:grid-cols-2">
      {initialTrip ? <input type="hidden" name="id" value={initialTrip.id} /> : null}
      <input type="hidden" name="travelers" value={travelersPayload} />

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
          Nombre del cliente
        </label>
        <input
          name="clientName"
          defaultValue={initialTrip?.clientName}
          placeholder="Nombre del contrato"
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
          Destino
        </label>
        <input
          name="destination"
          required
          defaultValue={initialTrip?.destination}
          placeholder="Puerto Vallarta"
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
          Hotel
        </label>
        <input
          name="hotel"
          defaultValue={initialTrip?.hotel}
          placeholder="Nombre del hotel"
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
          Proveedor
        </label>
        <input
          name="supplier"
          defaultValue={initialTrip?.supplier}
          placeholder="Operador, mayorista"
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
          Quién organizó / vendió
        </label>
        <input
          name="organizer"
          defaultValue={initialTrip?.organizer}
          placeholder="Asesor, agencia o vendedor"
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
          Número de pasajeros
        </label>
        <input
          type="number"
          min={0}
          name="passengerCount"
          value={passengerCountValue}
          onChange={(event) => setPassengerCountValue(event.target.value)}
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
        />
        <p className="text-xs text-slate-500">
          Se actualiza con la lista; puedes ajustar si aún no tienes todos los nombres.
        </p>
      </div>

      <div className="space-y-2 md:col-span-2">
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
          Pasajeros en lista ({travelerCount})
        </label>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="space-y-3">
            {travelers.map((traveler, index) => (
              <div key={index} className="grid gap-3 md:grid-cols-3">
                <input
                  placeholder="Nombre"
                  value={traveler.name}
                  onChange={(event) => handleTravelerChange(index, "name", event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                />
                <input
                  placeholder="Teléfono"
                  value={traveler.phone}
                  onChange={(event) => handleTravelerChange(index, "phone", event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                />
                <div className="flex gap-2">
                  <input
                    placeholder="Contrato / referencia"
                    value={traveler.contract}
                    onChange={(event) => handleTravelerChange(index, "contract", event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                  />
                  {travelers.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => handleRemoveTraveler(index)}
                      className="rounded-full border border-slate-200 px-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500"
                    >
                      -
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={handleAddTraveler}
            className="mt-3 rounded-full border border-brand-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700"
          >
            + Agregar persona
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
          Fecha de salida
        </label>
        <input
          type="date"
          name="departureDate"
          defaultValue={initialTrip?.departureDate ?? ""}
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
          Fecha de regreso
        </label>
        <input
          type="date"
          name="returnDate"
          defaultValue={initialTrip?.returnDate ?? ""}
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
        />
      </div>

      <div className="md:col-span-2 flex flex-wrap items-center justify-end gap-3">
        <Button type="submit" variant={initialTrip ? "secondary" : "primary"}>
          {submitLabel}
        </Button>
        {deleteAction ? (
          <Button
            type="submit"
            formAction={deleteAction}
            variant="subtle"
            onClick={handleDeleteClick}
          >
            Eliminar
          </Button>
        ) : null}
      </div>
      {dialog}
    </form>
  );
}
