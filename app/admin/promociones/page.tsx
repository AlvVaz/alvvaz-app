import { SectionHeading } from "@/components/section-heading";
import { getPromotions } from "@/lib/db";

import { deletePromotionAction, updatePromotionAction } from "./actions";
import { NewPromotionCard } from "./NewPromotionCard";
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

      <NewPromotionCard presetTags={PRESET_TAGS} />

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
