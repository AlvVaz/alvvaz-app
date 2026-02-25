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
      "Sí, nuestro equipo está atento durante todo tu viaje.",
  },
];

type Office = {
  title: string;
  whatsapp: string;
  email: string;
  schedule: string;
  addressLine1: string;
  addressLine2: string;
  mapTitle: string;
  mapEmbedUrl: string;
  mapLinkUrl: string;
};

const offices: Office[] = [
  {
    title: "OFICINA AVIACION",
    whatsapp: "+52 (444)1717405",
    email: "miguelalvarado@alvvaz.com",
    schedule: "Lunes a Viernes 11:30 am a 6:30 pm\nSabados 10:00 am a 4:00 pm",
    addressLine1: "Av. Hernan Cortes 508-A",
    addressLine2: "Col. Industrial Aviacion, San Luis Potosi, Mexico",
    mapTitle: "Mapa de ubicacion AlvVaz",
    mapEmbedUrl:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3694.803924783!2d-100.9931872!3d22.171534499999996!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x842a9f4360346189%3A0x7689f134548d99a!2sAgencia%20AlvVaz!5e0!3m2!1ses-419!2sca!4v1770145890000!5m2!1ses-419!2sca",
    mapLinkUrl:
      "https://www.google.com/maps/search/?api=1&query=22.1715345,-100.9931872",
  },
  {
    title: "OFICINA ORIENTE",
    whatsapp: "+52 (444)1717405",
    email: "miguelalvarado@alvvaz.com",
    schedule: "Lunes a Viernes 1:00 pm a 7:00 pm\nSabados cerrado",
    addressLine1: "Prol. Calle 30 #689",
    addressLine2: "Col. Villas del Sol / Casi Frente a la Comandancia Oriente",
    mapTitle: "Mapa de ubicacion Villas del Sol",
    mapEmbedUrl:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d386.42905341001654!2d-100.91036104173563!3d22.137062470954305!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x842aa3ea532852bb%3A0xc878c08f2ab384bb!2sProlongacion%20de%20la%20Calle%2030%20689%2C%20Villas%20del%20Sol%2C%2078394%20Pozos%2C%20S.L.P.%2C%20Mexico!5e0!3m2!1sen!2sca!4v1770307245311!5m2!1sen!2sca",
    mapLinkUrl:
      "https://www.google.com/maps/search/?api=1&query=22.13701844201469,-100.9099802029264",
  },
];

export default function ContactoPage() {
  return (
    <div className="space-y-24 pb-24 pt-12">
      <section>
        <Container className="space-y-8">
          <SectionHeading
            title="Contáctanos"
            subtitle="Estamos listos para diseñar tu próxima experiencia premium."
            kicker="Contacto"
          />

          <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {offices.map((office) => (
                <article
                  key={office.title}
                  className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/40 p-5"
                >
                  <h3 className="inline-flex items-center rounded-full border border-brand-500/60 bg-brand-100 px-4 py-1.5 text-xs font-extrabold uppercase tracking-[0.24em] text-brand-700">
                    {office.title}
                  </h3>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                      WhatsApp
                    </p>
                    <p className="text-sm text-slate-600 break-words">{office.whatsapp}</p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                      Email
                    </p>
                    <p className="text-sm text-slate-600 break-words">{office.email}</p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                      Horario
                    </p>
                    <p className="text-sm text-slate-600 whitespace-pre-line">{office.schedule}</p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                      Ubicacion
                    </p>
                    <p className="text-sm text-slate-600 break-words">{office.addressLine1}</p>
                    <p className="text-sm text-slate-600 break-words">{office.addressLine2}</p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                      Mapa
                    </p>
                    <div className="mt-3 h-40 w-full overflow-hidden rounded-2xl border border-slate-200">
                      <iframe
                        title={office.mapTitle}
                        src={office.mapEmbedUrl}
                        className="h-full w-full"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    </div>
                    <a
                      href={office.mapLinkUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex text-xs font-semibold uppercase tracking-[0.2em] text-brand-600 transition hover:text-brand-700"
                    >
                      Ver en Google Maps
                    </a>
                  </div>
                </article>
              ))}
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









