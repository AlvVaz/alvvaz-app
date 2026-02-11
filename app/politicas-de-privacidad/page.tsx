import { Container } from "@/components/container";
import { SectionHeading } from "@/components/section-heading";

const sections = [
  {
    title: "Responsable del tratamiento",
    body:
      "AlvVaz es responsable del uso y protección de sus datos personales. " +
      "Si tiene dudas sobre este aviso puede contactarnos en " +
      "miguelalvarado@alvvaz.com.",
  },
  {
    title: "Datos que podemos recopilar",
    items: [
      "Datos de identificación y contacto (nombre, correo, teléfono).",
      "Preferencias de viaje y detalles del itinerario solicitado.",
      "Información de facturación necesaria para emitir comprobantes.",
      "Datos técnicos básicos al navegar el sitio (por ejemplo, dirección IP).",
    ],
  },
  {
    title: "Finalidades del uso de datos",
    items: [
      "Atender solicitudes de información, cotizaciones o reservaciones.",
      "Gestionar pagos, facturación y soporte al cliente.",
      "Enviar comunicaciones relacionadas con servicios o promociones.",
      "Mejorar la experiencia del sitio y la calidad de nuestros servicios.",
    ],
  },
  {
    title: "Transferencias y proveedores",
    body:
      "Podemos compartir información con proveedores que nos ayudan a " +
      "operar el servicio (por ejemplo, plataformas de pago o de mensajería). " +
      "Estos terceros están obligados a proteger los datos y utilizarlos solo " +
      "para las finalidades indicadas.",
  },
  {
    title: "Cookies y tecnologías similares",
    body:
      "Utilizamos cookies para mejorar la navegación, analizar el tráfico y " +
      "personalizar contenido. Puede desactivar las cookies desde su navegador; " +
      "sin embargo, algunas funciones del sitio podrían verse limitadas.",
  },
  {
    title: "Derechos y opciones",
    body:
      "Puede solicitar acceso, rectificación, cancelación u oposición al " +
      "tratamiento de sus datos, así como limitar el uso o divulgación de los " +
      "mismos. Para ejercer sus derechos, escríbanos al correo indicado.",
  },
  {
    title: "Vigencia y cambios",
    body:
      "Este aviso puede actualizarse para reflejar mejoras en nuestras " +
      "prácticas. Publicaremos los cambios en esta misma página.",
  },
];

export default function PoliticasDePrivacidadPage() {
  return (
    <div className="space-y-16 pb-24 pt-12">
      <section>
        <Container className="space-y-10">
          <SectionHeading
            title="Políticas de privacidad"
            subtitle="Nuestro compromiso es proteger su información y usarla con transparencia."
            kicker="Legal"
          />
          <p className="max-w-3xl text-sm text-slate-600">
            Última actualización: 11 de febrero de 2026.
          </p>
        </Container>
      </section>

      <section className="bg-white py-16">
        <Container className="space-y-8">
          {sections.map((section) => (
            <div key={section.title} className="space-y-3">
              <h2 className="font-display text-lg font-semibold text-brand-950">
                {section.title}
              </h2>
              {section.body ? (
                <p className="text-sm text-slate-600">{section.body}</p>
              ) : null}
              {section.items ? (
                <ul className="list-disc space-y-2 pl-5 text-sm text-slate-600">
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </Container>
      </section>
    </div>
  );
}
