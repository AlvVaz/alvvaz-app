import { Container } from "@/components/container";
import { SectionHeading } from "@/components/section-heading";

const servicios = [
  {
    title: "Promociones a playas de México",
    description: "Escapadas premium a los destinos más icónicos del país.",
  },
  {
    title: "Vuelos + hotel",
    description: "Combinaciones flexibles con hoteles boutique o resorts.",
  },
  {
    title: "Tours y experiencias",
    description: "Actividades seleccionadas para viajeros exigentes.",
  },
  {
    title: "Seguros de viaje",
    description: "Coberturas completas para viajar con tranquilidad.",
  },
  {
    title: "Visas y documentación",
    description: "Asesoría para trámites y requisitos internacionales.",
  },
  {
    title: "Viajes a medida internacionales",
    description: "Diseño integral de rutas a Europa, Asia o América.",
  },
];

const pasos = [
  {
    title: "Cotiza",
    description: "Cuéntanos tu destino ideal y presupuesto en minutos.",
  },
  {
    title: "Reserva",
    description: "Confirmamos disponibilidad y aseguramos tu promoción.",
  },
  {
    title: "Viaja",
    description: "Disfruta con soporte continuo y experiencias memorables.",
  },
];

export default function ServiciosPage() {
  return (
    <div className="space-y-24 pb-24 pt-12">
      <section>
        <Container className="space-y-12">
          <SectionHeading
            title="Servicios premium para viajeros exigentes"
            subtitle="Seleccionamos cada detalle para que tu experiencia sea impecable."
            kicker="Servicios"
          />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {servicios.map((servicio) => (
              <div
                key={servicio.title}
                className="rounded-3xl border border-slate-200 bg-white p-6 transition-all duration-200 hover:-translate-y-1 hover:border-brand-400 hover:shadow-md"
              >
                <h3 className="font-display text-lg font-semibold text-brand-950">
                  {servicio.title}
                </h3>
                <p className="mt-3 text-sm text-slate-600">
                  {servicio.description}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-white py-16">
        <Container className="space-y-12">
          <SectionHeading
            title="Proceso simple y transparente"
            subtitle="Tres pasos claros para asegurar tu próxima experiencia."
            kicker="Proceso"
            align="center"
          />
          <div className="grid gap-6 md:grid-cols-3">
            {pasos.map((paso, index) => (
              <div
                key={paso.title}
                className="rounded-3xl border border-slate-200 bg-white p-6 text-center transition-all duration-200 hover:-translate-y-1 hover:border-brand-400"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                  Paso {index + 1}
                </p>
                <h3 className="mt-3 font-display text-lg font-semibold text-brand-950">
                  {paso.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  {paso.description}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>
    </div>
  );
}
