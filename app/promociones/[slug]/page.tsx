import Link from "next/link";
import { notFound } from "next/navigation";

import { Container } from "@/components/container";
import { ImageCarousel } from "@/components/image-carousel";
import { Badge } from "@/components/ui/badge";
import { buttonLinkStyles } from "@/components/ui/button";
import { getPromotionBySlug } from "@/lib/db";
import { formatPriceMXN } from "@/lib/utils";

export const dynamic = "force-dynamic";

type PromotionDetailPageProps = {
  params: { slug: string };
};

function buildWhatsAppMessage(title: string) {
  return `Hola, me interesa la promoción: ${title}. ¿Me compartes más detalles?`;
}

export default async function PromotionDetailPage({
  params,
}: PromotionDetailPageProps) {
  const promotion = await getPromotionBySlug(params.slug);
  if (!promotion || promotion.status !== "live") {
    notFound();
  }

  const images = promotion.images.map((image, index) => ({
    src: image.fileUrl,
    alt: `${promotion.title} ${index + 1}`,
  }));

  const ctaLabel = promotion.ctaLabel || "Reservar";
  const ctaHref =
    promotion.ctaLink ||
    `https://wa.me/?text=${encodeURIComponent(buildWhatsAppMessage(promotion.title))}`;

  const availableRange =
    promotion.availableFrom && promotion.availableTo
      ? `${promotion.availableFrom} → ${promotion.availableTo}`
      : promotion.availableFrom || promotion.availableTo || "Consulta disponibilidad";

  return (
    <div className="pb-24 pt-12">
      <Container className="space-y-16">
        <div className="grid items-start gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                Promoción
              </p>
              <h1 className="font-display text-3xl font-semibold text-brand-950 md:text-4xl">
                {promotion.title}
              </h1>
              <p className="text-sm text-slate-600">
                {promotion.destinationCity}, {promotion.destinationState}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {promotion.tags.map((tag) => (
                <Badge key={`${promotion.id}-${tag}`}>{tag}</Badge>
              ))}
              <Badge>{promotion.category}</Badge>
              <Badge>{promotion.budget}</Badge>
            </div>

            <p className="text-base text-slate-600">{promotion.summary}</p>

            <div className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                  Duración
                </p>
                <p className="mt-2">
                  {promotion.durationDays} días
                  {promotion.durationNights !== null
                    ? ` / ${promotion.durationNights} noches`
                    : ""}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                  Precio desde
                </p>
                <p className="mt-2 font-semibold text-brand-900">
                  {formatPriceMXN(promotion.priceFrom)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                  Fechas disponibles
                </p>
                <p className="mt-2">{availableRange}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                  Hotel
                </p>
                <p className="mt-2">
                  {promotion.hotelName || "Por definir"}
                </p>
                {promotion.hotelCategory ? (
                  <p className="text-xs text-slate-500">{promotion.hotelCategory}</p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <Link href={ctaHref} className={buttonLinkStyles({ variant: "primary" })}>
                {ctaLabel}
              </Link>
              <Link
                href="/promociones"
                className={buttonLinkStyles({ variant: "secondary" })}
              >
                Ver todas
              </Link>
            </div>
          </div>

          <div className="rounded-[36px] border border-slate-200 bg-white p-4 shadow-lg">
            {images.length > 0 ? (
              <ImageCarousel
                images={images}
                autoPlay
                interval={6000}
                className="border border-slate-200"
                aspectClassName="aspect-[4/3]"
                roundedClassName="rounded-[28px]"
                ariaLabel={`Galería de ${promotion.title}`}
              />
            ) : (
              <div className="aspect-[4/3] rounded-[28px] bg-gradient-to-br from-brand-200 via-white to-white" />
            )}
          </div>
        </div>

        {promotion.description ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-6">
            <h2 className="font-display text-lg text-brand-950">Descripción</h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              {promotion.description}
            </p>
          </section>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6">
            <h2 className="font-display text-lg text-brand-950">Incluye</h2>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              {promotion.includes.length === 0 ? (
                <li>Detalle pendiente.</li>
              ) : (
                promotion.includes.map((item, index) => <li key={index}>• {item}</li>)
              )}
            </ul>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6">
            <h2 className="font-display text-lg text-brand-950">No incluye</h2>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              {promotion.excludes.length === 0 ? (
                <li>Detalle pendiente.</li>
              ) : (
                promotion.excludes.map((item, index) => <li key={index}>• {item}</li>)
              )}
            </ul>
          </section>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6">
            <h2 className="font-display text-lg text-brand-950">Itinerario</h2>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              {promotion.itinerary.length === 0 ? (
                <li>Detalle pendiente.</li>
              ) : (
                promotion.itinerary.map((item, index) => <li key={index}>• {item}</li>)
              )}
            </ul>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6">
            <h2 className="font-display text-lg text-brand-950">Actividades</h2>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              {promotion.activities.length === 0 ? (
                <li>Detalle pendiente.</li>
              ) : (
                promotion.activities.map((item, index) => <li key={index}>• {item}</li>)
              )}
            </ul>
          </section>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-brand-100 via-white to-brand-200/70 p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl text-brand-950">
                ¿Listo para reservar?
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Escríbenos por WhatsApp y asegura tu promoción.
              </p>
            </div>
            <Link href={ctaHref} className={buttonLinkStyles({ variant: "primary" })}>
              {ctaLabel}
            </Link>
          </div>
        </section>
      </Container>
    </div>
  );
}
