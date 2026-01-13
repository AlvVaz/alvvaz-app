export type TravelPackage = {
  slug: string;
  title: string;
  destination: string;
  durationDays: number;
  priceFrom: number;
  type: "Playa México" | "Internacional";
  budget: "Económico" | "Estándar" | "Premium";
  tags: string[];
  summary: string;
  itinerary: Array<{ day: string; title: string; detail: string }>;
  includes: string[];
  excludes: string[];
  policies: string[];
};

export const travelPackages: TravelPackage[] = [
  {
    slug: "cancun-mar-turquesa",
    title: "Mar turquesa en Cancún",
    destination: "Cancún, Quintana Roo",
    durationDays: 5,
    priceFrom: 12900,
    type: "Playa México",
    budget: "Estándar",
    tags: ["Todo incluido", "Familiar"],
    summary:
      "Hotel frente al mar con actividades diarias y opciones gastronómicas premium.",
    itinerary: [
      {
        day: "Día 1",
        title: "Llegada y bienvenida",
        detail: "Traslado privado, check-in y tarde libre en la playa.",
      },
      {
        day: "Día 2",
        title: "Experiencia marina",
        detail: "Tour en catamarán y snorkel en arrecifes protegidos.",
      },
      {
        day: "Día 3",
        title: "Ruta gastronómica",
        detail: "Cena maridaje y acceso a beach club exclusivo.",
      },
      {
        day: "Día 4",
        title: "Relax total",
        detail: "Spa, alberca infinita y atardecer frente al mar.",
      },
    ],
    includes: [
      "Traslados aeropuerto-hotel",
      "Hospedaje 4 noches",
      "Desayunos y cenas",
      "Tour en catamarán",
    ],
    excludes: ["Propinas", "Gastos personales", "Impuestos locales"],
    policies: [
      "Reserva con 30% de anticipo",
      "Cambios con 15 días de anticipación",
      "Aplican cargos por cancelación",
    ],
  },
  {
    slug: "los-cabos-lujo-bahia",
    title: "Lujo en la bahía de Los Cabos",
    destination: "Los Cabos, Baja California Sur",
    durationDays: 4,
    priceFrom: 18900,
    type: "Playa México",
    budget: "Premium",
    tags: ["Pareja", "Relax"],
    summary:
      "Suite con vista al mar, experiencias privadas y cenas frente a la bahía.",
    itinerary: [
      {
        day: "Día 1",
        title: "Check-in premium",
        detail: "Bienvenida con cóctel y amenidades de lujo.",
      },
      {
        day: "Día 2",
        title: "Tour privado",
        detail: "Paseo en yate a El Arco con bebidas premium.",
      },
      {
        day: "Día 3",
        title: "Bienestar",
        detail: "Masaje en pareja y tarde libre en resort.",
      },
    ],
    includes: [
      "Traslados privados",
      "Hospedaje 3 noches",
      "Desayuno gourmet",
      "Tour en yate",
    ],
    excludes: ["Vuelos", "Propinas", "Consumos adicionales"],
    policies: [
      "Reserva con 50% de anticipo",
      "Cambios con 10 días de anticipación",
      "Aplican cargos por cancelación",
    ],
  },
  {
    slug: "riviera-maya-aventura",
    title: "Aventura en Riviera Maya",
    destination: "Riviera Maya, Quintana Roo",
    durationDays: 7,
    priceFrom: 15900,
    type: "Playa México",
    budget: "Estándar",
    tags: ["Aventura", "Todo incluido"],
    summary:
      "Explora cenotes, zonas arqueológicas y playas cristalinas.",
    itinerary: [
      {
        day: "Día 1",
        title: "Llegada",
        detail: "Check-in y recorrido por el resort.",
      },
      {
        day: "Día 2",
        title: "Cenotes",
        detail: "Excursión guiada con equipo de snorkel.",
      },
      {
        day: "Día 3",
        title: "Cultura maya",
        detail: "Visita a Tulum con guía especializado.",
      },
      {
        day: "Día 4",
        title: "Día libre",
        detail: "Actividades acuáticas y spa opcional.",
      },
    ],
    includes: [
      "Hospedaje 6 noches",
      "Alimentos y bebidas",
      "Tour a cenotes",
      "Entrada a Tulum",
    ],
    excludes: ["Propinas", "Souvenirs", "Seguro de viaje"],
    policies: [
      "Reserva con 30% de anticipo",
      "Cambios con 20 días de anticipación",
      "Aplican cargos por cancelación",
    ],
  },
  {
    slug: "puerto-vallarta-tradicion",
    title: "Tradición y mar en Puerto Vallarta",
    destination: "Puerto Vallarta, Jalisco",
    durationDays: 6,
    priceFrom: 9900,
    type: "Playa México",
    budget: "Económico",
    tags: ["Familiar", "Cultural"],
    summary:
      "Hospedaje céntrico con tour gastronómico y paseo por el malecón.",
    itinerary: [
      {
        day: "Día 1",
        title: "Bienvenida",
        detail: "Check-in y caminata por la zona histórica.",
      },
      {
        day: "Día 2",
        title: "Tour gastronómico",
        detail: "Ruta de sabores locales con guía.",
      },
      {
        day: "Día 3",
        title: "Playa y mercado",
        detail: "Tiempo libre y visita a mercado artesanal.",
      },
    ],
    includes: [
      "Hospedaje 5 noches",
      "Desayunos",
      "Tour gastronómico",
      "Guía local",
    ],
    excludes: ["Vuelos", "Propinas", "Alimentos no especificados"],
    policies: [
      "Reserva con 25% de anticipo",
      "Cambios con 10 días de anticipación",
      "Aplican cargos por cancelación",
    ],
  },
  {
    slug: "europa-capitales-elegantes",
    title: "Capitales elegantes de Europa",
    destination: "París, Roma y Madrid",
    durationDays: 10,
    priceFrom: 54900,
    type: "Internacional",
    budget: "Premium",
    tags: ["Pareja", "Cultural"],
    summary:
      "Hoteles boutique y experiencias privadas en las ciudades más icónicas.",
    itinerary: [
      {
        day: "Día 1",
        title: "París",
        detail: "Recorrido por el Sena y cena gourmet.",
      },
      {
        day: "Día 4",
        title: "Roma",
        detail: "Visita al Coliseo con guía privado.",
      },
      {
        day: "Día 7",
        title: "Madrid",
        detail: "Tour gastronómico y tarde en museos.",
      },
      {
        day: "Día 10",
        title: "Regreso",
        detail: "Traslados y check-out con asistencia.",
      },
    ],
    includes: [
      "Vuelos internacionales",
      "Hospedaje 9 noches",
      "Desayunos",
      "Tours privados",
    ],
    excludes: ["Propinas", "Impuestos turísticos", "Comidas no especificadas"],
    policies: [
      "Reserva con 40% de anticipo",
      "Cambios con 30 días de anticipación",
      "Aplican cargos por cancelación",
    ],
  },
  {
    slug: "asia-contrastes",
    title: "Asia de contrastes",
    destination: "Tokio, Seúl y Bangkok",
    durationDays: 12,
    priceFrom: 46800,
    type: "Internacional",
    budget: "Estándar",
    tags: ["Aventura", "Urbana"],
    summary:
      "Ruta urbana con experiencias gastronómicas y cultura contemporánea.",
    itinerary: [
      {
        day: "Día 1",
        title: "Tokio",
        detail: "City tour y visita a mercados nocturnos.",
      },
      {
        day: "Día 5",
        title: "Seúl",
        detail: "Palacios históricos y experiencia de K-beauty.",
      },
      {
        day: "Día 9",
        title: "Bangkok",
        detail: "Templos y cena en rooftop.",
      },
    ],
    includes: [
      "Vuelos internos",
      "Hospedaje 11 noches",
      "Guías locales",
      "Experiencias culinarias",
    ],
    excludes: ["Vuelos internacionales", "Propinas", "Seguro de viaje"],
    policies: [
      "Reserva con 35% de anticipo",
      "Cambios con 25 días de anticipación",
      "Aplican cargos por cancelación",
    ],
  },
  {
    slug: "new-york-escapada",
    title: "Escapada urbana a Nueva York",
    destination: "Nueva York, EE.UU.",
    durationDays: 5,
    priceFrom: 22900,
    type: "Internacional",
    budget: "Económico",
    tags: ["Urbana", "Familiar"],
    summary:
      "Hotel céntrico, paseos a pie y entradas a observatorios.",
    itinerary: [
      {
        day: "Día 1",
        title: "Midtown",
        detail: "Times Square y paseo nocturno guiado.",
      },
      {
        day: "Día 2",
        title: "Central Park",
        detail: "Tour en bicicleta con paradas icónicas.",
      },
      {
        day: "Día 3",
        title: "Brooklyn",
        detail: "Puente de Brooklyn y Dumbo.",
      },
    ],
    includes: [
      "Hospedaje 4 noches",
      "Tour a pie",
      "Entrada a observatorio",
      "Asistencia 24/7",
    ],
    excludes: ["Vuelos", "Propinas", "Traslados locales"],
    policies: [
      "Reserva con 30% de anticipo",
      "Cambios con 15 días de anticipación",
      "Aplican cargos por cancelación",
    ],
  },
  {
    slug: "patagonia-naturaleza",
    title: "Naturaleza premium en Patagonia",
    destination: "Patagonia, Chile y Argentina",
    durationDays: 9,
    priceFrom: 58900,
    type: "Internacional",
    budget: "Premium",
    tags: ["Aventura", "Pareja"],
    summary:
      "Lodges boutique con excursiones privadas y paisajes épicos.",
    itinerary: [
      {
        day: "Día 1",
        title: "Bienvenida",
        detail: "Recepción en lodge y cena de autor.",
      },
      {
        day: "Día 3",
        title: "Glaciares",
        detail: "Caminata guiada y navegación.",
      },
      {
        day: "Día 6",
        title: "Senderos",
        detail: "Ruta panorámica con picnic premium.",
      },
      {
        day: "Día 9",
        title: "Regreso",
        detail: "Check-out con asistencia y traslados.",
      },
    ],
    includes: [
      "Hospedaje 8 noches",
      "Excursiones privadas",
      "Desayunos y cenas",
      "Traslados internos",
    ],
    excludes: ["Vuelos", "Propinas", "Equipo especializado"],
    policies: [
      "Reserva con 50% de anticipo",
      "Cambios con 30 días de anticipación",
      "Aplican cargos por cancelación",
    ],
  },
];
