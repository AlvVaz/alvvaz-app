"use client";

import { useState } from "react";

import { NewPromotionForm } from "./NewPromotionForm";

type NewPromotionCardProps = {
  presetTags: string[];
};

export function NewPromotionCard({ presetTags }: NewPromotionCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-3xl border border-brand-200/80 bg-gradient-to-br from-brand-100 via-white to-brand-200/70 shadow-sm">
      <details
        className="group"
        open={open}
        onToggle={(event) => setOpen(event.currentTarget.open)}
      >
        <summary className="cursor-pointer list-none px-6 py-4 [&::-webkit-details-marker]:hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-lg text-brand-950">Nueva promoción</h3>
              <p className="mt-1 text-sm text-slate-600">
                Agrega una promoción y luego sube las imágenes del carrusel.
              </p>
            </div>
            <span className="rounded-full border border-brand-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
              Agregar
            </span>
          </div>
        </summary>
        <div className="border-t border-slate-200 px-6 py-6">
          <NewPromotionForm presetTags={presetTags} onCreated={() => setOpen(false)} />
        </div>
      </details>
    </section>
  );
}
