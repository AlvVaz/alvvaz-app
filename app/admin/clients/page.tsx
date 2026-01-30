import Link from "next/link";

import { SectionHeading } from "@/components/section-heading";
import { Button } from "@/components/ui/button";
import { formatTags, getClients, getContracts, getTrips } from "@/lib/db";

export const dynamic = "force-dynamic";

import { createClientAction, deleteClientAction, updateClientAction } from "./actions";

const statusOptions = [
  { value: "new", label: "Nuevo" },
  { value: "active", label: "Activo" },
  { value: "vip", label: "VIP" },
  { value: "archived", label: "Archivado" },
];

export default async function ClientsPage() {
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
      if (!traveler.name || !traveler.phone) return;
      const key = buildKey(traveler.name, traveler.phone);
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
      if (!traveler.name || !traveler.phone) return;
      const key = buildKey(traveler.name, traveler.phone);
      pushHistory(key, {
        type: "trip",
        label,
        href,
        date: formatDate(trip.departureDate || trip.createdAt),
        timestamp,
      });
    });
  });

  return (
    <div className="space-y-10">
      <SectionHeading
        title="Clientes"
        subtitle="Registra viajeros, añade etiquetas y mantén un historial claro."
        kicker="CRM"
      />

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
            <select
              name="status"
              defaultValue="new"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
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

      <section className="space-y-4">
        <h3 className="font-display text-lg text-brand-950">Listado actual</h3>
        {clients.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-brand-200 bg-white/60 p-6 text-sm text-slate-600">
            Aún no hay clientes registrados.
          </div>
        ) : (
          <div className="grid gap-6">
            {clients.map((client) => {
              const historyKey = buildKey(client.name, client.contact);
              const history = (historyMap.get(historyKey) ?? [])
                .slice()
                .sort((a, b) => b.timestamp - a.timestamp);

              return (
                <details
                  key={client.id}
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="font-display text-lg text-brand-950">{client.name}</p>
                        <p className="text-sm text-slate-600">{client.contact}</p>
                      </div>
                      <span className="rounded-full border border-brand-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
                        {client.status}
                      </span>
                    </div>
                    {client.tags.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {client.tags.slice(0, 6).map((tag) => (
                          <span
                            key={`${client.id}-${tag}`}
                            className="rounded-full border border-brand-200 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-700"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </summary>

                  <form
                    action={updateClientAction}
                    className="mt-6 grid gap-4 text-sm md:grid-cols-2"
                  >
                    <input type="hidden" name="id" value={client.id} />
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                        Nombre
                      </label>
                      <input
                        name="name"
                        defaultValue={client.name}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                        Contacto
                      </label>
                      <input
                        name="contact"
                        defaultValue={client.contact}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                        Etiquetas
                      </label>
                      <input
                        name="tags"
                        defaultValue={formatTags(client.tags)}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                        Estado
                      </label>
                      <select
                        name="status"
                        defaultValue={client.status}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                      >
                        {statusOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                        Notas
                      </label>
                      <textarea
                        name="notes"
                        defaultValue={client.notes}
                        className="min-h-[100px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                      />
                    </div>
                    <div className="md:col-span-2 flex flex-wrap items-center justify-end gap-3">
                      <Button type="submit" variant="secondary">
                        Guardar cambios
                      </Button>
                      <Button
                        type="submit"
                        formAction={deleteClientAction}
                        variant="subtle"
                        className="border border-rose-300 bg-rose-50 text-rose-700 shadow-sm hover:border-rose-400 hover:text-rose-800"
                      >
                        Eliminar
                      </Button>
                    </div>
                  </form>

                  <div className="mt-6 rounded-2xl border border-slate-200 bg-white/60 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                      Historial
                    </p>
                    {history.length === 0 ? (
                      <p className="mt-2 text-sm text-slate-500">
                        Aún no hay viajes o contratos asociados.
                      </p>
                    ) : (
                      <ul className="mt-3 space-y-2 text-sm text-slate-600">
                        {history.map((entry, index) => (
                          <li
                            key={`${client.id}-${entry.type}-${index}`}
                            className="flex flex-wrap items-center justify-between gap-3"
                          >
                            <div>
                              <p className="text-sm text-slate-700">{entry.label}</p>
                              <p className="text-xs text-slate-500">{entry.date}</p>
                            </div>
                            <Link
                              href={entry.href}
                              className="rounded-full border border-brand-200 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-700"
                            >
                              Ver
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
