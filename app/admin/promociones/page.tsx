import { SectionHeading } from "@/components/section-heading";
import { Button } from "@/components/ui/button";
import { getPromotions } from "@/lib/db";

import {
  createPromotionAction,
  deletePromotionAction,
  updatePromotionAction,
} from "./actions";
import { PromotionFields } from "./PromotionFields";
import { PromotionsAdminList } from "./PromotionsAdminList";

export const dynamic = "force-dynamic";

const PRESET_TAGS = [
  "Todo incluido",
  "Familiar",
  "Pareja",
  "Relax",
  "Aventura",
  "Playa México",
  "Premium",
  "Estándar",
  "Cultural",
  "Lujo",
  "City break",
];

export default async function PromocionesAdminPage() {
  const promotions = await getPromotions();

  return (
    <div className="space-y-10">
      <SectionHeading
        title="Promociones"
        subtitle="Crea, edita y publica promociones para la web."
        kicker="Admin"
      />

      <section className="rounded-3xl border border-brand-200/80 bg-gradient-to-br from-brand-100 via-white to-brand-200/70 shadow-sm">
        <details className="group">
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
            <form action={createPromotionAction} className="space-y-6">
              <PromotionFields presetTags={PRESET_TAGS} />
              <div className="flex justify-end">
                <Button type="submit">Crear promoción</Button>
              </div>
            </form>
          </div>
        </details>
      </section>

      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-500">
        Arrastra las tarjetas para ordenar dentro de cada sección.
      </div>

      <PromotionsAdminList
        promotions={promotions}
        presetTags={PRESET_TAGS}
        updateAction={updatePromotionAction}
        deleteAction={deletePromotionAction}
      />
    </div>
  );
}
