"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ReservacionesFormProps = {
  initialDestino?: string;
};

type FormState = {
  nombre: string;
  email: string;
  telefono: string;
  destino: string;
  fechas: string;
  personas: string;
  presupuesto: string;
  notas: string;
};

const steps = [
  "Comparte tu plan de viaje",
  "Confirmamos disponibilidad",
  "Listo para reservar",
];

export function ReservacionesForm({ initialDestino }: ReservacionesFormProps) {
  const [formData, setFormData] = useState<FormState>({
    nombre: "",
    email: "",
    telefono: "",
    destino: initialDestino ?? "",
    fechas: "",
    personas: "1",
    presupuesto: "Estándar",
    notas: "",
  });
  const [errors, setErrors] = useState<Partial<FormState>>({});
  const [status, setStatus] = useState<"idle" | "loading" | "success">(
    "idle"
  );

  const progress = useMemo(() => {
    if (status === "success") return 3;
    const fieldsFilled = [
      formData.nombre,
      formData.email,
      formData.telefono,
      formData.destino,
      formData.fechas,
    ].filter(Boolean).length;
    return fieldsFilled >= 4 ? 2 : 1;
  }, [formData, status]);

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSelect = (event: ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const newErrors: Partial<FormState> = {};
    if (!formData.nombre) newErrors.nombre = "Ingresa tu nombre";
    if (!formData.email) newErrors.email = "Ingresa un email válido";
    if (!formData.telefono) newErrors.telefono = "Ingresa tu teléfono";
    if (!formData.destino) newErrors.destino = "Indica un destino";
    if (!formData.fechas) newErrors.fechas = "Selecciona fechas";

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setStatus("loading");

    try {
      const response = await fetch("/api/reservaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Error en la solicitud");
      }

      setStatus("success");
    } catch {
      setStatus("idle");
    }
  };

  return (
    <div className="space-y-10">
      <div className="rounded-3xl border border-slate-200 bg-white p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
          Paso {progress} de 3
        </p>
        <div className="mt-4 space-y-3">
          {steps.map((step, index) => {
            const stepIndex = index + 1;
            return (
              <div key={step} className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold",
                    stepIndex <= progress
                      ? "border-brand-500 bg-brand-500 text-white"
                      : "border-slate-200 text-slate-500"
                  )}
                >
                  {stepIndex}
                </span>
                <p className="text-sm text-slate-600">{step}</p>
              </div>
            );
          })}
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid gap-6 rounded-3xl border border-slate-200 bg-white p-6 md:grid-cols-2"
      >
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            Nombre completo
          </label>
          <input
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            required
            aria-invalid={!!errors.nombre}
            className={cn(
              "w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 transition-colors duration-200 focus:border-brand-400 focus:outline-none",
              errors.nombre && "border-red-400"
            )}
            placeholder="Tu nombre"
          />
          {errors.nombre ? (
            <p className="text-xs text-red-500">{errors.nombre}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            Email
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            aria-invalid={!!errors.email}
            className={cn(
              "w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 transition-colors duration-200 focus:border-brand-400 focus:outline-none",
              errors.email && "border-red-400"
            )}
            placeholder="tucorreo@email.com"
          />
          {errors.email ? (
            <p className="text-xs text-red-500">{errors.email}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            Teléfono
          </label>
          <input
            type="tel"
            name="telefono"
            value={formData.telefono}
            onChange={handleChange}
            required
            aria-invalid={!!errors.telefono}
            className={cn(
              "w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 transition-colors duration-200 focus:border-brand-400 focus:outline-none",
              errors.telefono && "border-red-400"
            )}
            placeholder="+52 55 1234 5678"
          />
          {errors.telefono ? (
            <p className="text-xs text-red-500">{errors.telefono}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            Destino de interés
          </label>
          <input
            name="destino"
            value={formData.destino}
            onChange={handleChange}
            required
            aria-invalid={!!errors.destino}
            className={cn(
              "w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 transition-colors duration-200 focus:border-brand-400 focus:outline-none",
              errors.destino && "border-red-400"
            )}
            placeholder="Ej. Cancún, Europa, Asia"
          />
          {errors.destino ? (
            <p className="text-xs text-red-500">{errors.destino}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            Fechas
          </label>
          <input
            name="fechas"
            value={formData.fechas}
            onChange={handleChange}
            required
            aria-invalid={!!errors.fechas}
            className={cn(
              "w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 transition-colors duration-200 focus:border-brand-400 focus:outline-none",
              errors.fechas && "border-red-400"
            )}
            placeholder="dd/mm/aaaa - dd/mm/aaaa"
          />
          {errors.fechas ? (
            <p className="text-xs text-red-500">{errors.fechas}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            Número de personas
          </label>
          <input
            type="number"
            min={1}
            name="personas"
            value={formData.personas}
            onChange={handleChange}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 transition-colors duration-200 focus:border-brand-400 focus:outline-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            Presupuesto
          </label>
          <select
            name="presupuesto"
            value={formData.presupuesto}
            onChange={handleSelect}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 transition-colors duration-200 focus:border-brand-400 focus:outline-none"
          >
            <option>Económico</option>
            <option>Estándar</option>
            <option>Premium</option>
          </select>
        </div>

        <div className="md:col-span-2 space-y-2">
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            Notas adicionales
          </label>
          <textarea
            name="notas"
            value={formData.notas}
            onChange={handleChange}
            className="min-h-[120px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 transition-colors duration-200 focus:border-brand-400 focus:outline-none"
            placeholder="Preferencias, horarios, detalles especiales"
          />
        </div>

        <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            Te responderemos en menos de 24 horas hábiles.
          </p>
          <Button type="submit" disabled={status === "loading"}>
            {status === "loading" ? "Enviando..." : "Enviar solicitud"}
          </Button>
        </div>

        {status === "success" ? (
          <div className="md:col-span-2 rounded-2xl border border-brand-200 bg-brand-200/30 px-4 py-3 text-sm text-brand-700">
            Solicitud enviada. Un asesor de AlvVaz se pondrá en contacto contigo.
          </div>
        ) : null}
      </form>
    </div>
  );
}
