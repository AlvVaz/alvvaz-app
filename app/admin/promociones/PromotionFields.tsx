"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { TagsInput } from "./TagsInput";
import { ThemedSelect } from "@/components/ui/themed-select";

import type { Promotion } from "@/lib/db";
import { slugify } from "@/lib/db/utils";

type PromotionFieldsProps = {
  defaults?: Partial<Promotion>;
  presetTags: string[];
  afterDescription?: ReactNode;
};

export function PromotionFields({
  defaults,
  presetTags,
  afterDescription,
}: PromotionFieldsProps) {
  const [baseUrl, setBaseUrl] = useState("");
  const [titleValue, setTitleValue] = useState(defaults?.title ?? "");
  const [ctaLinkValue, setCtaLinkValue] = useState(defaults?.ctaLink ?? "");
  const [ctaLinkTouched, setCtaLinkTouched] = useState(Boolean(defaults?.ctaLink));

  useEffect(() => {
    if (typeof window === "undefined") return;
    setBaseUrl(window.location.origin);
  }, []);

  useEffect(() => {
    if (!defaults?.title) return;
    setTitleValue(defaults.title);
  }, [defaults?.title]);

  const promotionSlug = useMemo(() => {
    return defaults?.slug || slugify(titleValue);
  }, [defaults?.slug, titleValue]);

  const defaultCtaLink = useMemo(() => {
    if (!baseUrl) return "";
    const promotionUrl = promotionSlug
      ? `${baseUrl}/promociones/${promotionSlug}`
      : `${baseUrl}/promociones`;
    const message = `Hola, me interesa la promoción: ${titleValue}. ¿Me pudieras dar más detalles?\n${promotionUrl}`;
    return `https://wa.me/5214441717405?text=${encodeURIComponent(message)}`;
  }, [baseUrl, promotionSlug, titleValue]);

  useEffect(() => {
    if (ctaLinkTouched) return;
    if (!defaultCtaLink) return;
    setCtaLinkValue(defaultCtaLink);
  }, [ctaLinkTouched, defaultCtaLink]);

  return (
    <div className="grid gap-4 text-sm md:grid-cols-2">
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
          Título
        </label>
        <input
          name="title"
          value={titleValue}
          onChange={(event) => {
            setTitleValue(event.target.value);
            if (!ctaLinkTouched) {
              setCtaLinkValue("");
            }
          }}
          placeholder="Escapada Premium en Cancún"
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            Ciudad
          </label>
          <input
            name="destinationCity"
            defaultValue={defaults?.destinationCity ?? ""}
            placeholder="Cancún"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            Estado
          </label>
          <input
            name="destinationState"
            defaultValue={defaults?.destinationState ?? ""}
            placeholder="Quintana Roo"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            Duración (días)
          </label>
          <input
            name="durationDays"
            type="number"
            min={1}
            defaultValue={defaults?.durationDays ?? ""}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            Duración (noches)
          </label>
          <input
            name="durationNights"
            type="number"
            min={0}
            defaultValue={defaults?.durationNights ?? ""}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            Precio desde (MXN)
          </label>
          <input
            name="priceFrom"
            type="number"
            min={0}
            defaultValue={defaults?.priceFrom ?? ""}
            placeholder="MXN"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            Estado de publicación
          </label>
          <ThemedSelect
            name="status"
            defaultValue={defaults?.status ?? "draft"}
            options={[
              { value: "live", label: "Live" },
              { value: "paused", label: "Pausado" },
              { value: "draft", label: "Borrador" },
            ]}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            Categoría
          </label>
          <input
            name="category"
            defaultValue={defaults?.category ?? ""}
            placeholder="Playa México"
            list="promocion-categorias"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            required
          />
          <datalist id="promocion-categorias">
            <option value="Playa México" />
            <option value="Internacional" />
            <option value="Aventura" />
            <option value="Ciudad" />
            <option value="Romance" />
          </datalist>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            Presupuesto
          </label>
          <input
            name="budget"
            defaultValue={defaults?.budget ?? ""}
            placeholder="Estándar"
            list="promocion-presupuestos"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            required
          />
          <datalist id="promocion-presupuestos">
            <option value="Económico" />
            <option value="Estándar" />
            <option value="Premium" />
          </datalist>
        </div>
      </div>
      <div className="md:col-span-2 space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
          Resumen corto
        </label>
        <textarea
          name="summary"
          defaultValue={defaults?.summary ?? ""}
          placeholder="Resumen breve para el card."
          className="min-h-[80px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
          required
        />
      </div>
      <div className="md:col-span-2 space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
          Descripción larga
        </label>
        <textarea
          name="description"
          defaultValue={defaults?.description ?? ""}
          placeholder="Descripción extendida para la página detalle."
          className="min-h-[120px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
        />
      </div>
      {afterDescription ? <div className="md:col-span-2">{afterDescription}</div> : null}
      <div className="md:col-span-2">
        <TagsInput
          name="tags"
          presetTags={presetTags}
          defaultTags={defaults?.tags ?? []}
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
          Incluye
        </label>
        <textarea
          name="includes"
          defaultValue={(defaults?.includes ?? []).join("\n")}
          placeholder={`Hospedaje
Traslados
Desayunos`}
          className="min-h-[120px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
          No incluye
        </label>
        <textarea
          name="excludes"
          defaultValue={(defaults?.excludes ?? []).join("\n")}
          placeholder={`Propinas
Seguro de viaje`}
          className="min-h-[120px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
          Itinerario
        </label>
        <textarea
          name="itinerary"
          defaultValue={(defaults?.itinerary ?? []).join("\n")}
          placeholder={`Día 1 · Llegada y check-in
Día 2 · Tour principal`}
          className="min-h-[120px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
          Actividades
        </label>
        <textarea
          name="activities"
          defaultValue={(defaults?.activities ?? []).join("\n")}
          placeholder={`Snorkel
Cena romántica
Spa`}
          className="min-h-[120px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-3 md:col-span-2">
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            Fecha disponible (desde)
          </label>
          <input
            name="availableFrom"
            type="date"
            defaultValue={defaults?.availableFrom ?? ""}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            Fecha disponible (hasta)
          </label>
          <input
            name="availableTo"
            type="date"
            defaultValue={defaults?.availableTo ?? ""}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:col-span-2">
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            Hotel
          </label>
          <input
            name="hotelName"
            defaultValue={defaults?.hotelName ?? ""}
            placeholder="Hotel Flamingo"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            Categoría hotel
          </label>
          <input
            name="hotelCategory"
            defaultValue={defaults?.hotelCategory ?? ""}
            placeholder="5 estrellas"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:col-span-2">
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            CTA (texto botón)
          </label>
          <input
            name="ctaLabel"
            defaultValue={defaults?.ctaLabel ?? ""}
            placeholder="Reservar"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            CTA (link)
          </label>
          <input
            name="ctaLink"
            value={ctaLinkValue}
            onChange={(event) => {
              setCtaLinkTouched(true);
              setCtaLinkValue(event.target.value);
            }}
            placeholder="https://wa.me/?text=..."
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
          />
        </div>
      </div>
    </div>
  );
}
