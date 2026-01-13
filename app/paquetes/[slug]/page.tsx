import Link from "next/link";
import { notFound } from "next/navigation";

import { Container } from "@/components/container";
import { Badge } from "@/components/ui/badge";
import { buttonLinkStyles } from "@/components/ui/button";
import { travelPackages } from "@/lib/data";
import { formatPriceMXN } from "@/lib/utils";

type PaqueteDetailPageProps = {
  params: { slug: string };
};

export default function PaqueteDetailPage({ params }: PaqueteDetailPageProps) {
  const pkg = travelPackages.find((item) => item.slug === params.slug);

  if (!pkg) {
    notFound();
  }

  return (
    <div className="pb-24 pt-12">
      <Container className="space-y-12">
        <Link
          href="/paquetes"
          className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600 hover:text-brand-700"
        >
          &larr; Volver a paquetes
        </Link>

        <div className="grid gap-10 lg:grid-cols-[1.4fr_0.9fr]">
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {pkg.tags.map((tag) => (
                  <Badge key={`${pkg.slug}-${tag}`}>{tag}</Badge>
                ))}
                <Badge className="border-brand-300 text-brand-700">
                  {pkg.type}
                </Badge>
              </div>
              <h1 className="font-display text-4xl font-semibold text-brand-950">
                {pkg.title}
              </h1>
              <p className="text-base text-slate-600">{pkg.destination}</p>
              <p className="text-sm text-slate-600">{pkg.summary}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="h-40 rounded-3xl border border-slate-200 bg-gradient-to-br from-brand-200 via-white to-white" />
              <div className="h-40 rounded-3xl border border-slate-200 bg-gradient-to-br from-brand-200 via-white to-white" />
              <div className="h-40 rounded-3xl border border-slate-200 bg-gradient-to-br from-brand-200 via-white to-white" />
              <div className="h-40 rounded-3xl border border-slate-200 bg-gradient-to-br from-brand-200 via-white to-white" />
            </div>

            <section className="space-y-4">
              <h2 className="font-display text-2xl font-semibold text-brand-950">
                Itinerario sugerido
              </h2>
              <div className="space-y-4">
                {pkg.itinerary.map((item) => (
                  <div
                    key={item.day}
                    className="rounded-2xl border border-slate-200 bg-white p-4 transition-all duration-200 hover:border-brand-400"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                      {item.day}
                    </p>
                    <h3 className="mt-2 font-display text-lg font-semibold text-brand-950">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {item.detail}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <h3 className="font-display text-xl font-semibold text-brand-950">
                  Incluye
                </h3>
                <ul className="space-y-2 text-sm text-slate-600 list-disc pl-4">
                  {pkg.includes.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="space-y-3">
                <h3 className="font-display text-xl font-semibold text-brand-950">
                  No incluye
                </h3>
                <ul className="space-y-2 text-sm text-slate-600 list-disc pl-4">
                  {pkg.excludes.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="font-display text-xl font-semibold text-brand-950">
                Políticas
              </h3>
              <ul className="space-y-2 text-sm text-slate-600 list-disc pl-4">
                {pkg.policies.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          </div>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                Desde
              </p>
              <p className="mt-2 font-display text-3xl font-semibold text-brand-950">
                {formatPriceMXN(pkg.priceFrom)}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                {pkg.durationDays} días - {pkg.budget}
              </p>
              <Link
                href={`/reservaciones?paquete=${pkg.slug}`}
                className={buttonLinkStyles({ variant: "primary", className: "mt-6 w-full" })}
              >
                Reservar este paquete
              </Link>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6">
              <h3 className="font-display text-lg font-semibold text-brand-950">
                ¿Necesitas asesoría?
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Nuestro equipo puede personalizar este paquete a tu medida.
              </p>
              <Link
                href="/contacto"
                className={buttonLinkStyles({ variant: "secondary", className: "mt-4 w-full" })}
              >
                Hablar con un asesor
              </Link>
            </div>
          </aside>
        </div>
      </Container>
    </div>
  );
}
