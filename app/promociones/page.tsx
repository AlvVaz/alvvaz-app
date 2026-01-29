import { Container } from "@/components/container";
import { SectionHeading } from "@/components/section-heading";
import { getPromotions } from "@/lib/db";

import { PromocionesGrid } from "./PromocionesGrid";

export const dynamic = "force-dynamic";

export default async function PromocionesPage() {
  const promotions = await getPromotions({ status: "live" });

  return (
    <div className="pb-24 pt-12">
      <Container className="space-y-12">
        <SectionHeading
          title="Promociones para cada estilo"
          subtitle="Filtra por tipo de viaje, duración y presupuesto para encontrar tu opción ideal."
          kicker="Promociones"
        />
        <PromocionesGrid promotions={promotions} />
      </Container>
    </div>
  );
}
