import { Container } from "@/components/container";
import { SectionHeading } from "@/components/section-heading";
import { travelPackages } from "@/lib/data";

import { PaquetesGrid } from "./PaquetesGrid";

export default function PaquetesPage() {
  return (
    <div className="space-y-16 pb-24 pt-12">
      <Container className="space-y-10">
        <SectionHeading
          title="Paquetes curados para cada estilo"
          subtitle="Filtra por tipo de viaje, duración y presupuesto para encontrar tu opción ideal."
          kicker="Paquetes"
        />
        <PaquetesGrid packages={travelPackages} />
      </Container>
    </div>
  );
}
