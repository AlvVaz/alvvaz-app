"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { ImageCarousel } from "@/components/image-carousel";
import { Badge } from "@/components/ui/badge";
import { buttonLinkStyles } from "@/components/ui/button";
import type { TravelPackage } from "@/lib/data";
import { cn, durationBucket, formatPriceMXN } from "@/lib/utils";

const typeOptions = ["Todos", "Playa México", "Internacional"] as const;
const durationOptions = ["Todos", "3-5", "6-8", "9+"] as const;
const budgetOptions = ["Todos", "Económico", "Estándar", "Premium"] as const;

const patagoniaImages = [
  { src: "/patagonia1.jpg", alt: "Paisaje de Patagonia 1" },
  { src: "/patagonia2.jpg", alt: "Paisaje de Patagonia 2" },
  { src: "/patagonia3.jpg", alt: "Paisaje de Patagonia 3" },
  { src: "/patagonia4.jpg", alt: "Paisaje de Patagonia 4" },
];

const newYorkImages = [
  { src: "/new-york-1.jpg", alt: "Vista urbana de Nueva York 1" },
  { src: "/new-york-2.avif", alt: "Vista urbana de Nueva York 2" },
  { src: "/new-york-3.avif", alt: "Vista urbana de Nueva York 3" },
  { src: "/new-york-4.webp", alt: "Vista urbana de Nueva York 4" },
];

const asiaImages = [
  { src: "/tokio.jpg", alt: "Vista nocturna de Tokio" },
  { src: "/tokio1.jpg", alt: "Cruce urbano en Tokio" },
  { src: "/tokio2.jpg", alt: "Detalle arquitectonico en Tokio" },
  { src: "/seul.webp", alt: "Panoramica urbana en Seul" },
  { src: "/seul2.jpg", alt: "Calles modernas en Seul" },
  { src: "/bangkok.jpg", alt: "Panoramica de Bangkok" },
  { src: "/bangkok1.avif", alt: "Templo iluminado en Bangkok" },
];

const vallartaImages = [
  { src: "/Vallarta/vallarta-2.jpg", alt: "Playa iconica de Puerto Vallarta" },
  { src: "/Vallarta/vallarta-6.jpg", alt: "Playas doradas en Puerto Vallarta" },
  { src: "/Vallarta/vallarta-1.webp", alt: "Vista costera en Puerto Vallarta" },
  { src: "/Vallarta/vallarta-4.jpg", alt: "Estilo de vida en Puerto Vallarta" },
];

const cancunImages = [
  { src: "/cancun/cancun-2.webp", alt: "Vista aerea de Cancun" },
  { src: "/cancun/cancun-1.jpeg", alt: "Playa turquesa en Cancun" },
  { src: "/cancun/cancun-5.webp", alt: "Resort de lujo en Cancun" },
  { src: "/cancun/cancun-6.webp", alt: "Costa de Cancun al atardecer" },
];

const europaPackageImages = [
  { src: "/Europa/europa-2.webp", alt: "Torre Eiffel en Paris" },
  { src: "/Europa/europa-4.jpg", alt: "Museo Louvre en Paris" },
  { src: "/roma1.jpg", alt: "Ciudad eterna en Roma" },
  { src: "/roma2.webp", alt: "Arquitectura historica en Roma" },
  { src: "/roma3.webp", alt: "Monumento iconico en Roma" },
  { src: "/Europa/europa-6.webp", alt: "Vista urbana de Barcelona" },
  { src: "/Europa/europa-5.jpg", alt: "Centro historico en Munich" },
  { src: "/Europa/europa-8.webp", alt: "Paisaje europeo emblematico" },
];

const rivieraImages = [
  {
    src: "/best-luxury-hotels-in-riviera-maya-for-couples-Grand-Velas-Riviera-Maya-meilleurs-tout-inclus-pour-couples-Riviera-Maya-1024x683.jpg",
    alt: "Suite de lujo frente al mar en Riviera Maya",
  },
  {
    src: "/hotel-xcaret-mexico.jpg",
    alt: "Hotel Xcaret Mexico con vista tropical",
  },
  {
    src: "/plage-riviera-maya.webp",
    alt: "Playa de Riviera Maya al atardecer",
  },
  {
    src: "/playadelcarmen-destino.webp",
    alt: "Playa del Carmen con aguas cristalinas",
  },
  {
    src: "/riviera-1.jpg",
    alt: "Riviera Maya con vegetacion y mar turquesa",
  },
];

const losCabosImages = [
  { src: "/loscabos/los-cabos-2.jpg", alt: "Formaciones rocosas en Los Cabos" },
  { src: "/roma1.jpg", alt: "Ciudad eterna en Roma" },
  { src: "/loscabos/los-cabos-1.webp", alt: "Vista de playa en Los Cabos" },
  { src: "/tokio.jpg", alt: "Vista nocturna de Tokio" },
  { src: "/loscabos/los-cabos-3.avif", alt: "Resort frente al mar en Los Cabos" },
  { src: "/bangkok.jpg", alt: "Panoramica de Bangkok" },
  { src: "/loscabos/los-cabos-4.jpg", alt: "Bahia dorada en Los Cabos" },
  { src: "/roma2.webp", alt: "Arquitectura historica en Roma" },
  { src: "/loscabos/los-cabos-5.jpg", alt: "Atardecer en Los Cabos" },
  { src: "/tokio1.jpg", alt: "Cruce urbano en Tokio" },
  { src: "/loscabos/los-cabos-6.jpeg", alt: "Vista panoramica de Los Cabos" },
  { src: "/bangkok1.avif", alt: "Templo iluminado en Bangkok" },
  { src: "/loscabos/los-cabos-7.webp", alt: "Playa y marina en Los Cabos" },
  { src: "/roma3.webp", alt: "Monumento iconico en Roma" },
  { src: "/tokio2.jpg", alt: "Detalle arquitectonico en Tokio" },
];

const packageImagesBySlug: Record<string, { src: string; alt: string }[]> = {
  "patagonia-naturaleza": patagoniaImages,
  "new-york-escapada": newYorkImages,
  "asia-contrastes": asiaImages,
  "puerto-vallarta-tradicion": vallartaImages,
  "cancun-mar-turquesa": cancunImages,
  "europa-capitales-elegantes": europaPackageImages,
  "riviera-maya-aventura": rivieraImages,
  "los-cabos-lujo-bahia": losCabosImages,
};

type FilterValue<T extends readonly string[]> = T[number];

type FilterGroupProps<T extends readonly string[]> = {
  label: string;
  options: T;
  value: FilterValue<T>;
  onChange: (value: FilterValue<T>) => void;
};

function FilterGroup<T extends readonly string[]>({
  label,
  options,
  value,
  onChange,
}: FilterGroupProps<T>) {
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

type PaquetesGridProps = {
  packages: TravelPackage[];
};

export function PaquetesGrid({ packages }: PaquetesGridProps) {
  const [type, setType] = useState<FilterValue<typeof typeOptions>>("Todos");
  const [duration, setDuration] =
    useState<FilterValue<typeof durationOptions>>("Todos");
  const [budget, setBudget] =
    useState<FilterValue<typeof budgetOptions>>("Todos");

  const filtered = useMemo(() => {
    return packages.filter((pkg) => {
      const matchesType = type === "Todos" || pkg.type === type;
      const matchesBudget = budget === "Todos" || pkg.budget === budget;
      const bucket = durationBucket(pkg.durationDays);
      const matchesDuration = duration === "Todos" || bucket === duration;
      return matchesType && matchesBudget && matchesDuration;
    });
  }, [packages, type, duration, budget]);

  return (
    <div className="space-y-12">
      <div className="grid gap-8 rounded-3xl border border-slate-200 bg-white p-6 lg:grid-cols-3">
        <FilterGroup
          label="Tipo"
          options={typeOptions}
          value={type}
          onChange={setType}
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
        <p>Mostrando {filtered.length} paquetes</p>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-600">
          No encontramos paquetes con esos filtros. Prueba otra combinación.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((pkg) => (
            <article
              key={pkg.slug}
              className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-6 transition-all duration-200 hover:-translate-y-1 hover:border-brand-400 hover:shadow-lg"
            >
              {packageImagesBySlug[pkg.slug] ? (
                <ImageCarousel
                  images={packageImagesBySlug[pkg.slug]}
                  autoPlay
                  interval={6000}
                  className="mb-4 border border-slate-200"
                  aspectClassName="aspect-[4/3]"
                  roundedClassName="rounded-2xl"
                  showControls
                  showIndicators={false}
                  ariaLabel={`Galería de ${pkg.title}`}
                />
              ) : (
                <div className="mb-4 h-32 w-full rounded-2xl bg-gradient-to-br from-brand-200 via-white to-white" />
              )}
              <div className="flex flex-wrap gap-2">
                {pkg.tags.map((tag) => (
                  <Badge key={`${pkg.slug}-${tag}`}>{tag}</Badge>
                ))}
              </div>
              <h3 className="mt-4 font-display text-xl font-semibold text-brand-950">
                {pkg.title}
              </h3>
              <p className="mt-2 text-sm text-slate-600">{pkg.destination}</p>
              <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
                <span>{pkg.durationDays} días</span>
                <span className="font-semibold text-brand-700">
                  Desde {formatPriceMXN(pkg.priceFrom)}
                </span>
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                <Badge className="border-brand-300 text-brand-700">
                  {pkg.type}
                </Badge>
                <Badge className="border-brand-300 text-brand-700">
                  {pkg.budget}
                </Badge>
              </div>
              <div className="mt-6">
                <Link
                  href={`/paquetes/${pkg.slug}`}
                  className={buttonLinkStyles({ variant: "secondary" })}
                >
                  Ver detalle
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
