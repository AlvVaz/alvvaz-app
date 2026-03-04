"use client";

import type { MouseEvent, WheelEvent } from "react";
import { useMemo, useState } from "react";

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

const preventNumberInputWheel = (event: WheelEvent<HTMLInputElement>) => {
  event.currentTarget.blur();
};

const countTravelers = (travelers: TripTraveler[]) =>
  travelers.filter((traveler) => traveler.name || traveler.phone || traveler.contract).length;

export function TripForm({ action, deleteAction, initialTrip, submitLabel }: TripFormProps) {
  const { confirm, dialog } = useConfirmDialog();
  const [travelers, setTravelers] = useState<TripTraveler[]>(
    initialTrip?.travelers?.length ? initialTrip.travelers : [emptyTraveler]
  );

  const travelersPayload = useMemo(() => JSON.stringify(travelers), [travelers]);
  const travelerCount = countTravelers(travelers);
  const initialPassengerCountValue =
    initialTrip?.passengerCount !== undefined
      ? String(initialTrip.passengerCount)
      : String(travelerCount);

  const [passengerCountValue, setPassengerCountValue] = useState(initialPassengerCountValue);
  const [isPassengerCountManual, setIsPassengerCountManual] = useState(
    initialTrip?.passengerCount !== undefined
      ? initialPassengerCountValue !== String(travelerCount)
      : false
  );

  const syncPassengerCountIfNeeded = (nextTravelers: TripTraveler[]) => {
    if (isPassengerCountManual) return;
    setPassengerCountValue(String(countTravelers(nextTravelers)));
  };

  const handleTravelerChange = (index: number, field: keyof TripTraveler, value: string) => {
    setTravelers((prev) => {
      const nextTravelers = prev.map((traveler, currentIndex) =>
        currentIndex === index ? { ...traveler, [field]: value } : traveler
      );
      syncPassengerCountIfNeeded(nextTravelers);
      return nextTravelers;
    });
  };

  const handleAddTraveler = () => {
    setTravelers((prev) => {
      const nextTravelers = [...prev, { ...emptyTraveler }];
      syncPassengerCountIfNeeded(nextTravelers);
      return nextTravelers;
    });
  };

  const handleRemoveTraveler = (index: number) => {
    setTravelers((prev) => {
      const nextTravelers = prev.filter((_, currentIndex) => currentIndex !== index);
      syncPassengerCountIfNeeded(nextTravelers);
      return nextTravelers;
    });
  };

  const handleReset = () => {
    if (!initialTrip) {
      setTravelers([emptyTraveler]);
      setPassengerCountValue("0");
      setIsPassengerCountManual(false);
      return;
    }

    const nextTravelers = initialTrip.travelers?.length ? initialTrip.travelers : [emptyTraveler];
    const nextTravelerCount = countTravelers(nextTravelers);
    const nextPassengerCountValue =
      initialTrip.passengerCount !== undefined
        ? String(initialTrip.passengerCount)
        : String(nextTravelerCount);

    setTravelers(nextTravelers);
    setPassengerCountValue(nextPassengerCountValue);
    setIsPassengerCountManual(
      initialTrip.passengerCount !== undefined
        ? nextPassengerCountValue !== String(nextTravelerCount)
        : false
    );
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
          Quien organizo / vendio
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
          Numero de pasajeros
        </label>
        <input
          type="number"
          min={0}
          name="passengerCount"
          value={passengerCountValue}
          onChange={(event) => {
            setPassengerCountValue(event.target.value);
            setIsPassengerCountManual(true);
          }}
          onWheel={preventNumberInputWheel}
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
        />
        <p className="text-xs text-slate-500">
          Se actualiza con la lista; puedes ajustar si aun no tienes todos los nombres.
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
                  placeholder="Telefono"
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
