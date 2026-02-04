import { SectionHeading } from "@/components/section-heading";
import { getClients, getContracts, getTrips } from "@/lib/db";

export const dynamic = "force-dynamic";

import {
  createClientAction,
  deleteClientAction,
  updateClientAction,
  bulkDeleteClientsAction,
} from "./actions";
import ClientsDashboard from "./ClientsDashboard";

type ClientsPageProps = {
  searchParams?: { q?: string; tags?: string };
};

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
  const clients = await getClients();
  const contracts = await getContracts();
  const trips = await getTrips();

  const normalizeName = (value: string) =>
    value.trim().replace(/\s+/g, " ").toLowerCase();
  const normalizeContact = (value: string) => value.trim();
  const buildKey = (name: string, contact: string) =>
    `${normalizeName(name)}|${normalizeContact(contact)}`;

  const formatDate = (value: string | null) => {
    if (!value) return "Sin fecha";
    const date = new Date(value);
    return new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  };

  const historyMap = new Map<
    string,
    Array<{
      type: "contract" | "trip";
      label: string;
      href: string;
      date: string;
      timestamp: number;
    }>
  >();

  const pushHistory = (
    key: string,
    entry: {
      type: "contract" | "trip";
      label: string;
      href: string;
      date: string;
      timestamp: number;
    }
  ) => {
    const current = historyMap.get(key) ?? [];
    current.push(entry);
    historyMap.set(key, current);
  };

  contracts.forEach((contract) => {
    const timestamp = contract.createdAt
      ? new Date(contract.createdAt).getTime()
      : 0;
    const label = `Contrato ${
      contract.contractNumber ? `#${contract.contractNumber}` : ""
    } · ${contract.destination}`;
    const href =
      contract.fileUrl || `/admin/contratos#contract-${contract.id}`;
    contract.travelers.forEach((traveler) => {
      if (!traveler.name) return;
      const key = buildKey(traveler.name, traveler.phone || "");
      pushHistory(key, {
        type: "contract",
        label,
        href,
        date: formatDate(contract.reservationDate || contract.createdAt),
        timestamp,
      });
    });
  });

  trips.forEach((trip) => {
    const timestamp = trip.createdAt ? new Date(trip.createdAt).getTime() : 0;
    const label = `Viaje · ${trip.destination}`;
    const href = `/admin/viajes#trip-${trip.id}`;
    trip.travelers.forEach((traveler) => {
      if (!traveler.name) return;
      const key = buildKey(traveler.name, traveler.phone || "");
      pushHistory(key, {
        type: "trip",
        label,
        href,
        date: formatDate(trip.departureDate || trip.createdAt),
        timestamp,
      });
    });
  });

  const normalizeText = (value: string) =>
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const historyByKey = Object.fromEntries(
    Array.from(historyMap.entries()).map(([key, entries]) => [key, entries])
  );

  return (
    <div className="space-y-10">
      <SectionHeading
        title="Clientes"
        subtitle="Registra viajeros, añade etiquetas y mantén un historial claro."
        kicker="CRM"
      />
      <ClientsDashboard
        clients={clients}
        historyByKey={historyByKey}
        createAction={createClientAction}
        updateAction={updateClientAction}
        deleteAction={deleteClientAction}
        bulkDeleteAction={bulkDeleteClientsAction}
        initialQuery={String(searchParams?.q ?? "")}
        initialTags={String(searchParams?.tags ?? "")}
      />
    </div>
  );
}
