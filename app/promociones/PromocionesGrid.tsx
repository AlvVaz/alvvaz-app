"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { ImageCarousel } from "@/components/image-carousel";
import { Badge } from "@/components/ui/badge";
import { buttonLinkStyles } from "@/components/ui/button";
import type { Promotion } from "@/lib/db";
import { cn, durationBucket, formatPriceMXN } from "@/lib/utils";

const durationOptions = ["Todos", "3-5", "6-8", "9+"];

type FilterGroupProps = {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
};

function FilterGroup({
  label,
  options,
  value,
  onChange,
}: FilterGroupProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            aria-pressed={value === option}
            className={cn(
              "rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-600 transition-all duration-200",
              "hover:border-brand-400 hover:text-brand-700",
              value === option &&
                "border-brand-500 bg-brand-200/40 text-brand-950"
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

type PromocionesGridProps = {
  promotions: Promotion[];
};

export function PromocionesGrid({ promotions }: PromocionesGridProps) {
  const categoryOptions = useMemo(() => {
    const categories = Array.from(
      new Set(promotions.map((promo) => promo.category).filter(Boolean))
    );
    return ["Todos", ...categories];
  }, [promotions]);

  const budgetOptions = useMemo(() => {
    const budgets = Array.from(
      new Set(promotions.map((promo) => promo.budget).filter(Boolean))
    );
    return ["Todos", ...budgets];
  }, [promotions]);

  const [category, setCategory] = useState("Todos");
  const [duration, setDuration] = useState("Todos");
  const [budget, setBudget] = useState("Todos");

  const filtered = useMemo(() => {
    return promotions.filter((promo) => {
      const matchesCategory =
        category === "Todos" || promo.category === category;
      const matchesBudget = budget === "Todos" || promo.budget === budget;
      const bucket = durationBucket(promo.durationDays);
      const matchesDuration = duration === "Todos" || bucket === duration;
      return matchesCategory && matchesBudget && matchesDuration;
    });
  }, [promotions, category, duration, budget]);

  return (
    <div className="space-y-12">
      <div className="grid gap-8 rounded-3xl border border-slate-200 bg-white p-6 lg:grid-cols-3">
        <FilterGroup
          label="Categoría"
          options={categoryOptions}
          value={category}
          onChange={setCategory}
        />
        <FilterGroup
          label="Duración"
          options={durationOptions}
          value={duration}
          onChange={setDuration}
        />
        <FilterGroup
          label="Presupuesto"
          options={budgetOptions}
          value={budget}
          onChange={setBudget}
        />
      </div>

      <div className="flex items-center justify-between text-sm text-slate-600">
        <p>Mostrando {filtered.length} promociones</p>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
          Curaduría AlvVaz
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-600">
          No encontramos promociones con esos filtros. Prueba otra combinación.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((promo) => {
            const images = promo.images.map((image, index) => ({
              src: image.fileUrl,
              alt: `${promo.title} ${index + 1}`,
            }));

            return (
              <article
                key={promo.id}
                className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-6 transition-all duration-200 hover:-translate-y-1 hover:border-brand-400 hover:shadow-lg"
              >
                {images.length > 0 ? (
                  <ImageCarousel
                    images={images}
                    autoPlay
                    interval={6000}
                    className="mb-4 border border-slate-200"
                    aspectClassName="aspect-[4/3]"
                    roundedClassName="rounded-2xl"
                    showControls
                    showIndicators={false}
                    ariaLabel={`Galería de ${promo.title}`}
                  />
                ) : (
                  <div className="mb-4 h-32 w-full rounded-2xl bg-gradient-to-br from-brand-200 via-white to-white" />
                )}
                <div className="flex flex-wrap gap-2">
                  {promo.tags.map((tag) => (
                    <Badge key={`${promo.id}-${tag}`}>{tag}</Badge>
                  ))}
                </div>
                <h3 className="mt-4 font-display text-xl text-brand-950">
                  {promo.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  {promo.destinationCity}, {promo.destinationState}
                </p>
                <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
                  <span>{promo.durationDays} días</span>
                  <span className="font-semibold text-brand-700">
                    Desde {formatPriceMXN(promo.priceFrom)}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge>{promo.category}</Badge>
                  <Badge>{promo.budget}</Badge>
                </div>
                <div className="mt-6">
                  <Link
                    href={`/promociones/${promo.slug}`}
                    className={buttonLinkStyles({ variant: "secondary" })}
                  >
                    Ver detalle
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
