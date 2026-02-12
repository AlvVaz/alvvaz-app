import Link from "next/link";

import { Container } from "@/components/container";
import { ImageCarousel } from "@/components/image-carousel";
import { SectionHeading } from "@/components/section-heading";
import { Badge } from "@/components/ui/badge";
import { buttonLinkStyles } from "@/components/ui/button";

const heroImages = [
  {
    src: "/cancun/cancun-2.webp",
    alt: "Vista aerea de Cancun",
  },
  {
    src: "/tokio.jpg",
    alt: "Vista nocturna de Tokio",
  },
  {
    src: "/Europa/europa-2.webp",
    alt: "Torre Eiffel iluminada en Paris",
  },
  {
    src: "/loscabos/los-cabos-2.jpg",
    alt: "Formaciones rocosas en Los Cabos",
  },
  {
    src: "/roma1.jpg",
    alt: "Ciudad eterna en Roma",
  },
  {
    src: "/plage-riviera-maya.webp",
    alt: "Playa de Riviera Maya al atardecer",
  },
  {
    src: "/bangkok.jpg",
    alt: "Panoramica de Bangkok",
  },
  {
    src: "/Vallarta/vallarta-6.jpg",
    alt: "Playas doradas en Puerto Vallarta",
  },
  {
    src: "/Europa/europa-4.jpg",
    alt: "Museo Louvre en Paris",
  },
  {
    src: "/playadelcarmen-destino.webp",
    alt: "Playa del Carmen con aguas cristalinas",
  },
  {
    src: "/Turquia/turquia-1.jpg",
    alt: "Globo aerostatico en Capadocia, Turquia",
  },
  {
    src: "/hotel-xcaret-mexico.jpg",
    alt: "Hotel Xcaret Mexico con vista tropical",
  },
  {
    src: "/tokio1.jpg",
    alt: "Cruce urbano en Tokio",
  },
  {
    src: "/cancun/cancun-5.webp",
    alt: "Resort de lujo en Cancun",
  },
  {
    src: "/Turquia/turquia-6.jpg",
    alt: "Tour premium por Turquia",
  },
  {
    src: "/loscabos/los-cabos-4.jpg",
    alt: "Bahia dorada en Los Cabos",
  },
];

const rivieraImages = [
  {
    src: "/best-luxury-hotels-in-riviera-maya-for-couples-Grand-Velas-Riviera-Maya-meilleurs-tout-inclus-pour-couples-Riviera-Maya-1024x683.jpg",
    alt: "Suite de lujo frente al mar en Riviera Maya",
  },
  {
    src: "/hotel-xcaret-mexico.jpg",
    alt: "Hotel Xcaret Mexico con vista tropical",
  },
  {
    src: "/plage-riviera-maya.webp",
    alt: "Playa de Riviera Maya al atardecer",
  },
  {
    src: "/playadelcarmen-destino.webp",
    alt: "Playa del Carmen con aguas cristalinas",
  },
  {
    src: "/riviera-1.jpg",
    alt: "Riviera Maya con vegetacion y mar turquesa",
  },
];

const turquiaImages = [
  {
    src: "/Turquia/turquia-1.jpg",
    alt: "Globo aerostatico en Capadocia, Turquia",
  },
  {
    src: "/Turquia/turquia-2.jpg",
    alt: "Paisaje de Capadocia, Turquia",
  },
  {
    src: "/Turquia/turquia-3.jpeg",
    alt: "Escena urbana en Turquia",
  },
  {
    src: "/Turquia/turquia-4.jpg",
    alt: "Vista iconica de Turquia",
  },
  {
    src: "/Turquia/turquia-5.webp",
    alt: "Recorrido cultural en Turquia",
  },
  {
    src: "/Turquia/turquia-6.jpg",
    alt: "Tour premium por Turquia",
  },
];

const losCabosImages = [
  {
    src: "/loscabos/los-cabos-2.jpg",
    alt: "Formaciones rocosas en Los Cabos",
  },
  {
    src: "/loscabos/los-cabos-1.webp",
    alt: "Vista de playa en Los Cabos",
  },
  {
    src: "/loscabos/los-cabos-3.avif",
    alt: "Resort frente al mar en Los Cabos",
  },
  {
    src: "/loscabos/los-cabos-4.jpg",
    alt: "Bahia dorada en Los Cabos",
  },
  {
    src: "/loscabos/los-cabos-5.jpg",
    alt: "Atardecer en Los Cabos",
  },
  {
    src: "/loscabos/los-cabos-6.jpeg",
    alt: "Vista panoramica de Los Cabos",
  },
  {
    src: "/loscabos/los-cabos-7.webp",
    alt: "Playa y marina en Los Cabos",
  },
];

const vallartaImages = [
  {
    src: "/Vallarta/vallarta-1.webp",
    alt: "Vista costera en Puerto Vallarta",
  },
  {
    src: "/Vallarta/vallarta-2.jpg",
    alt: "Playa icónica de Puerto Vallarta",
  },
  {
    src: "/Vallarta/vallarta-3.webp",
    alt: "Vista aerea de Puerto Vallarta",
  },
  {
    src: "/Vallarta/vallarta-4.jpg",
    alt: "Estilo de vida en Puerto Vallarta",
  },
  {
    src: "/Vallarta/vallarta-5.jpg",
    alt: "Zona costera de Puerto Vallarta",
  },
  {
    src: "/Vallarta/vallarta-6.jpg",
    alt: "Playas doradas en Puerto Vallarta",
  },
  {
    src: "/Vallarta/vallarta-7.webp",
    alt: "Actividades y mar en Puerto Vallarta",
  },
];

const europaImages = [
  {
    src: "/Europa/europa-1.jpg",
    alt: "Ciudad europea con arquitectura clasica",
  },
  {
    src: "/Europa/europa-2.webp",
    alt: "Torre Eiffel iluminada en Paris",
  },
  {
    src: "/Europa/europa-3.jpg",
    alt: "Calle tradicional en Alemania",
  },
  {
    src: "/Europa/europa-4.jpg",
    alt: "Museo Louvre en Paris",
  },
  {
    src: "/Europa/europa-5.jpg",
    alt: "Centro historico en Munich",
  },
  {
    src: "/Europa/europa-6.webp",
    alt: "Vista urbana de Barcelona",
  },
  {
    src: "/Europa/europa-7.webp",
    alt: "Ciudad patrimonio cultural en Europa",
  },
  {
    src: "/Europa/europa-8.webp",
    alt: "Paisaje emblematico europeo",
  },
];

const cancunImages = [
  {
    src: "/cancun/cancun-1.jpeg",
    alt: "Playa turquesa en Cancun",
  },
  {
    src: "/cancun/cancun-2.webp",
    alt: "Vista aerea de Cancun",
  },
  {
    src: "/cancun/cancun-3.jpg",
    alt: "Cultura maya en Cancun",
  },
  {
    src: "/cancun/cancun-4.jpg",
    alt: "Letrero iconico de Cancun",
  },
  {
    src: "/cancun/cancun-5.webp",
    alt: "Resort de lujo en Cancun",
  },
  {
    src: "/cancun/cancun-6.webp",
    alt: "Costa de Cancun al atardecer",
  },
];

const destinos = [
  {
    name: "Cancún",
    description: "Playas turquesa y resorts de lujo.",
    images: cancunImages,
  },
  {
    name: "Los Cabos",
    description: "Escapes exclusivos frente al mar.",
    images: losCabosImages,
  },
  {
    name: "Puerto Vallarta",
    description: "Tradición mexicana y atardeceres épicos.",
    images: vallartaImages,
  },
  {
    name: "Riviera Maya",
    description: "Cenotes, cultura y relax premium.",
    images: rivieraImages,
  },
  {
    name: "Europa",
    description: "Ciudades icónicas con estilo boutique.",
    images: europaImages,
  },
  {
    name: "Turquía",
    description: "Capadocia, Estambul y rutas históricas premium.",
    images: turquiaImages,
  },
];

const beneficios = [
  {
    title: "Atención personalizada",
    description: "Asesoría experta para diseñar tu itinerario ideal.",
  },
  {
    title: "Pagos seguros",
    description: "Procesos confiables y opciones flexibles de pago.",
  },
  {
    title: "Itinerarios a medida",
    description: "Experiencias curadas según tu estilo y presupuesto.",
  },
  {
    title: "Soporte 24/7",
    description: "Acompañamiento durante todo el viaje.",
  },
];

const testimonios = [
  {
    name: "Andrea L.",
    quote:
      "Todo fue impecable. Nos encantó la atención y las recomendaciones premium.",
  },
  {
    name: "Carlos M.",
    quote:
      "Reservamos Los Cabos y fue una experiencia de lujo sin preocupaciones.",
  },
  {
    name: "Valeria P.",
    quote:
      "El itinerario internacional estuvo perfectamente planeado, gran soporte.",
  },
];

export default function Home() {
  return (
    <div className="space-y-24 pb-24">
      <section className="relative isolate overflow-hidden bg-white pb-16 pt-20">
        <div
          className="absolute inset-0 z-10 bg-cover bg-center opacity-55 mix-blend-multiply"
          style={{ backgroundImage: "url(/BG1.jpg)" }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 z-0 bg-gradient-to-r from-white via-white/85 to-white/70" />
        <div className="pointer-events-none absolute -top-40 right-10 z-10 h-72 w-72 rounded-full bg-brand-200/70 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-10 z-10 h-72 w-72 rounded-full bg-brand-400/20 blur-3xl" />
        <Container className="relative z-20">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-8">
              <Badge className="w-fit">Agencia premium</Badge>
              <div className="space-y-4">
                <h1 className="font-display text-4xl font-semibold tracking-tight text-brand-950 md:text-5xl">
                  Viaja con AlvVaz: playas de México y destinos por todo el
                  mundo
                </h1>
                <p className="text-base text-slate-600 md:text-lg">
                  Diseñamos viajes exclusivos con un servicio elegante y
                  transparente. Experiencias de alto nivel, sin complicaciones.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <Link
                  href="/promociones"
                  className={buttonLinkStyles({ variant: "primary" })}
                >
                  Ver Promociones
                </Link>
                <Link
                  href="/reservaciones"
                  className={buttonLinkStyles({ variant: "secondary" })}
                >
                  Reservar
                </Link>
              </div>
              <div className="flex flex-wrap gap-6 text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                <span>Asesoría experta</span>
                <span>Experiencias boutique</span>
                <span>Atención 24/7</span>
              </div>
            </div>

            <div className="relative">
              <div className="animate-fade-up rounded-[32px] border border-slate-200 bg-gradient-to-br from-brand-200 via-white to-white p-10 shadow-lg md:p-12">
                <div className="space-y-6">
                  <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                    <span>Temporada 2025</span>
                    <span>Playa & Mundo</span>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-slate-500">
                      Experiencias premium
                    </p>
                    <p className="font-display text-3xl font-semibold text-brand-950">
                      Planeamos cada detalle para que viajes sin estrés.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm text-slate-600">
                    <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-brand-200/40 via-white to-white px-4 py-3">
                      Promociones VIP
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-brand-200/40 via-white to-white px-4 py-3">
                      Pagos flexibles
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-brand-200/40 via-white to-white px-4 py-3">
                      Itinerarios a medida
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-brand-200/40 via-white to-white px-4 py-3">
                      Soporte continuo
                    </div>
                  </div>
                </div>
              </div>
              <div className="pointer-events-none absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-brand-500/20 blur-2xl" />
            </div>
          </div>

          <div className="mt-12">
            <ImageCarousel
              images={heroImages}
              autoPlay
              interval={6000}
              className="border border-slate-200 shadow-lg"
              aspectClassName="aspect-[4/3] sm:aspect-[16/9]"
              roundedClassName="rounded-[36px]"
              priority
              ariaLabel="Galería principal de destinos AlvVaz"
            />
          </div>
        </Container>
      </section>

      <section>
        <Container className="space-y-12">
          <SectionHeading
            title="Destinos destacados"
            subtitle="Selección de destinos en México y el mundo."
            kicker="Explora"
          />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {destinos.map((destino) => (
              <div
                key={destino.name}
                className="group rounded-3xl border border-slate-200 bg-white p-6 transition-all duration-200 hover:-translate-y-1 hover:border-brand-400 hover:shadow-lg"
              >
                <ImageCarousel
                  images={destino.images}
                  className="mb-4 border border-slate-200 transition-colors duration-200 group-hover:border-brand-400"
                  aspectClassName="aspect-[4/3]"
                  roundedClassName="rounded-2xl"
                  showIndicators={false}
                  ariaLabel={`Galería de ${destino.name}`}
                />
                <h3 className="font-display text-xl font-semibold text-brand-950">
                  {destino.name}
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  {destino.description}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-white py-16">
        <Container className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <SectionHeading
            title="Por qué AlvVaz"
            subtitle="Un servicio premium pensado para viajeros exigentes."
            kicker="Experiencia"
          />
          <div className="grid gap-6 sm:grid-cols-2">
            {beneficios.map((beneficio) => (
              <div
                key={beneficio.title}
                className="rounded-3xl border border-slate-200 bg-gradient-to-br from-brand-400/70 via-white to-white p-6 transition-all duration-200 hover:-translate-y-1 hover:border-brand-400"
              >
                <h3 className="font-display text-lg font-semibold text-brand-950">
                  {beneficio.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  {beneficio.description}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section>
        <Container className="space-y-12">
          <SectionHeading
            title="Testimonios"
            subtitle="Historias reales de viajeros que confiaron en AlvVaz."
            kicker="Confianza"
          />
          <div className="grid gap-6 md:grid-cols-3">
            {testimonios.map((testimonio) => (
              <div
                key={testimonio.name}
                className="rounded-3xl border border-slate-200 bg-gradient-to-br from-brand-400/50 via-white to-white p-6 transition-all duration-200 hover:-translate-y-1 hover:border-brand-400 hover:shadow-md"
              >
                <p className="text-base text-slate-600">"{testimonio.quote}"</p>
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                  {testimonio.name}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>
    </div>
  );
}

