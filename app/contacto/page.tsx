import { Container } from "@/components/container";
import { SectionHeading } from "@/components/section-heading";

import { ContactoForm } from "./ContactoForm";

const faq = [
  {
    question: "¿Cuánto tiempo tarda la confirmación?",
    answer:
      "Normalmente confirmamos disponibilidad en menos de 24 horas hábiles.",
  },
  {
    question: "¿Puedo personalizar un paquete?",
    answer:
      "Sí. Podemos ajustar hoteles, vuelos, actividades y duración según tu perfil.",
  },
  {
    question: "¿Qué métodos de pago aceptan?",
    answer:
      "Transferencia, tarjetas de crédito y planes de pago flexibles.",
  },
  {
    question: "¿Ofrecen asistencia durante el viaje?",
    answer:
      "Sí. Nuestro equipo está disponible 24/7 durante todo tu viaje.",
  },
];

export default function ContactoPage() {
  return (
    <div className="space-y-24 pb-24 pt-12">
      <section>
        <Container className="grid gap-12 lg:grid-cols-[1fr_1.1fr]">
          <div className="space-y-8">
            <SectionHeading
              title="Contáctanos"
              subtitle="Estamos listos para diseñar tu próxima experiencia premium."
              kicker="Contacto"
            />
            <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                  WhatsApp
                </p>
                <p className="text-sm text-slate-600 break-words">
                  +52 (444) 171-74-05
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                  Email
                </p>
                <p className="text-sm text-slate-600 break-words">
                  miguelalvarado@alvvaz.com
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                  Horario
                </p>
                <p className="text-sm text-slate-600">
                  Lunes a sábado - 9:00 a 20:00
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                  Ubicación
                </p>
                <p className="text-sm text-slate-600 break-words">
                  Av. Hernan Cortes 508-A
                </p>
                <p className="text-sm text-slate-600 break-words">
                  Col. Industrial Aviacion, San Luis Potosi, Mexico
                </p>
                <div className="relative mt-3 h-32 w-full overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-brand-200 via-white to-white">
                  <div className="absolute left-5 top-6 h-0.5 w-20 bg-brand-200/70" />
                  <div className="absolute right-6 top-10 h-0.5 w-16 bg-brand-200/70" />
                  <div className="absolute left-8 bottom-8 h-0.5 w-24 bg-brand-200/70" />
                  <div className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border border-brand-400/70" />
                  <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-600 shadow-sm" />
                  <span className="sr-only">
                    Mapa de ubicación en San Luis Potosi
                  </span>
                </div>
              </div>
            </div>
          </div>

          <ContactoForm />
        </Container>
      </section>

      <section className="bg-white py-16">
        <Container className="space-y-12">
          <SectionHeading
            title="Preguntas frecuentes"
            subtitle="Resolvemos tus dudas antes de reservar."
            kicker="FAQ"
            align="center"
          />
          <div className="mx-auto grid max-w-3xl gap-4">
            {faq.map((item) => (
              <details
                key={item.question}
                className="group rounded-3xl border border-slate-200 bg-white p-6 transition-all duration-200 hover:border-brand-400"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-brand-950">
                  {item.question}
                  <span className="text-brand-600 transition-transform duration-200 group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm text-slate-600">{item.answer}</p>
              </details>
            ))}
          </div>
        </Container>
      </section>
    </div>
  );
}
