import { Container } from "@/components/container";
import { SectionHeading } from "@/components/section-heading";
import { travelPackages } from "@/lib/data";

import { ReservacionesForm } from "./ReservacionesForm";

type ReservacionesPageProps = {
  searchParams?: { paquete?: string };
};

export default function ReservacionesPage({ searchParams }: ReservacionesPageProps) {
  const paqueteSlug = searchParams?.paquete;
  const selectedPackage = travelPackages.find(
    (pkg) => pkg.slug === paqueteSlug
  );
  const destino = selectedPackage
    ? `${selectedPackage.destination} (${selectedPackage.title})`
    : "";

  return (
    <div className="pb-24 pt-12">
      <Container className="space-y-10">
        <SectionHeading
          title="Reservaciones premium"
          subtitle="Completa el formulario y un asesor confirmará disponibilidad para tu próxima experiencia."
          kicker="Reservar"
        />
        <ReservacionesForm initialDestino={destino} />
      </Container>
    </div>
  );
}
