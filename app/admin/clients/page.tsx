import { SectionHeading } from "@/components/section-heading";
import { Button } from "@/components/ui/button";
import { ThemedSelect } from "@/components/ui/themed-select";
import { getClients, getContracts, getTrips } from "@/lib/db";

export const dynamic = "force-dynamic";

import {
  createClientAction,
  deleteClientAction,
  updateClientAction,
  bulkDeleteClientsAction,
} from "./actions";
import ClientsList from "./ClientsList";

const statusOptions = [
  { value: "new", label: "Nuevo" },
  { value: "active", label: "Activo" },
  { value: "vip", label: "VIP" },
  { value: "archived", label: "Archivado" },
];

type ClientsPageProps = {
  searchParams?: { q?: string; missing?: string };
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

  const query = normalizeText(String(searchParams?.q ?? "").trim());
  const tokens = query
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);
  const missingPhone = searchParams?.missing === "phone";
  const hasPhoneDigits = (value: string) =>
    value.replace(/\D/g, "").length >= 7;

  const filteredClients = clients.filter((client) => {
    if (missingPhone && hasPhoneDigits(client.contact || "")) return false;
    if (!tokens.length) return true;
    const nameValue = normalizeText(client.name);
    const matchesName = tokens.some((token) => nameValue.includes(token));
    const matchesTag = client.tags.some((tag) =>
      tokens.some((token) => normalizeText(tag).includes(token))
    );
    return matchesName || matchesTag;
  });

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

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <form method="get" className="flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
              Buscar por nombre o etiqueta
            </label>
            <input
              name="q"
              defaultValue={searchParams?.q ?? ""}
              placeholder="Cancún, familiar, Miguel..."
              className="w-64 rounded-2xl border border-slate-200 px-4 py-2 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
              Sin teléfono
            </label>
            <ThemedSelect
              name="missing"
              defaultValue={missingPhone ? "phone" : "all"}
              options={[
                { value: "all", label: "Todos" },
                { value: "phone", label: "Sin teléfono" },
              ]}
              className="w-44"
            />
          </div>
          <Button type="submit">Aplicar filtros</Button>
        </form>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <details className="group">
          <summary className="cursor-pointer list-none px-6 py-4 [&::-webkit-details-marker]:hidden">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-lg text-brand-950">Nuevo cliente</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Usa etiquetas para identificar presupuesto, destino preferido o fecha
                  de viaje.
                </p>
              </div>
              <span className="rounded-full border border-brand-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
                Agregar
              </span>
            </div>
          </summary>
          <div className="border-t border-slate-200 px-6 py-6">
            <form action={createClientAction} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
              Nombre
            </label>
                <input
                  name="name"
                  required
                  placeholder="Nombre del Nuevo Cliente"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
              Contacto
            </label>
            <input
              name="contact"
              required
              placeholder="Email o WhatsApp"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
              Etiquetas
            </label>
            <input
              name="tags"
              placeholder="premium, playa, familiar"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
              Estado
            </label>
            <ThemedSelect
              name="status"
              defaultValue="new"
              options={statusOptions}
            />
          </div>
          <div className="md:col-span-2 space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
              Notas
            </label>
            <textarea
              name="notes"
              className="min-h-[100px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
              placeholder="Preferencias, historial de viaje, follow-ups pendientes"
            />
          </div>
            <div className="md:col-span-2 flex items-center justify-end">
              <Button type="submit">Guardar cliente</Button>
            </div>
          </form>
        </div>
        </details>
      </section>

      <ClientsList
        clients={filteredClients}
        historyByKey={historyByKey}
        updateAction={updateClientAction}
        deleteAction={deleteClientAction}
        bulkDeleteAction={bulkDeleteClientsAction}
      />
    </div>
  );
}
