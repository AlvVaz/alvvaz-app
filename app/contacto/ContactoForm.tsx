"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FormState = {
  nombre: string;
  email: string;
  mensaje: string;
};

export function ContactoForm() {
  const [formData, setFormData] = useState<FormState>({
    nombre: "",
    email: "",
    mensaje: "",
  });
  const [status, setStatus] = useState<"idle" | "success">("idle");
  const whatsappNumber = "5214441717405";

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = [
      `Hola, soy ${formData.nombre}.`,
      `Email: ${formData.email}`,
      formData.mensaje,
    ]
      .filter(Boolean)
      .join("\n");
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
      message
    )}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    setStatus("success");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6"
    >
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
          Contacto
        </p>
        <h3 className="font-display text-2xl text-brand-950">
          Formulario de contacto
        </h3>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
          Nombre
        </label>
        <input
          name="nombre"
          value={formData.nombre}
          onChange={handleChange}
          required
          className={cn(
            "w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 transition-colors duration-200 focus:border-brand-400 focus:outline-none"
          )}
          placeholder="Tu nombre"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
          Email (Opcional)
        </label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          className={cn(
            "w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 transition-colors duration-200 focus:border-brand-400 focus:outline-none"
          )}
          placeholder="tucorreo@email.com"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
          Mensaje
        </label>
        <textarea
          name="mensaje"
          value={formData.mensaje}
          onChange={handleChange}
          required
          className="min-h-[120px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 transition-colors duration-200 focus:border-brand-400 focus:outline-none"
          placeholder="Cuentanos como podemos ayudarte"
        />
      </div>

      <Button type="submit">Enviar mensaje</Button>
      {status === "success" ? (
        <p className="text-sm text-brand-700">
          Gracias por contactarnos. Te responderemos pronto.
        </p>
      ) : null}
    </form>
  );
}
