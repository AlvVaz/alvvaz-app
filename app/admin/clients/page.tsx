import { SectionHeading } from "@/components/section-heading";
import { Button } from "@/components/ui/button";
import { formatTags, getClients } from "@/lib/db";

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

  return (
    <div className="space-y-10">
      <SectionHeading
        title="Clientes"
        subtitle="Registra viajeros, añade etiquetas y mantén un historial claro."
        kicker="CRM"
      />

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="font-display text-lg text-brand-950">Nuevo cliente</h3>
        <p className="mt-1 text-sm text-slate-600">
          Usa etiquetas para identificar presupuesto, destino preferido o fecha
          de viaje.
        </p>
        <form action={createClientAction} className="mt-4 grid gap-4 md:grid-cols-2">
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
      </section>

      <section className="space-y-4">
        <h3 className="font-display text-lg text-brand-950">Listado actual</h3>
        {clients.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-brand-200 bg-white/60 p-6 text-sm text-slate-600">
            Aún no hay clientes registrados.
          </div>
        ) : (
          <div className="grid gap-6">
            {clients.map((client) => (
              <div
                key={client.id}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="font-display text-lg text-brand-950">{client.name}</p>
                    <p className="text-sm text-slate-600">{client.contact}</p>
                  </div>
                  <span className="rounded-full border border-brand-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
                    {client.status}
                  </span>
                </div>

                <form
                  action={updateClientAction}
                  className="mt-4 grid gap-4 text-sm md:grid-cols-2"
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
                    <Button type="submit" formAction={deleteClientAction} variant="subtle">
                      Eliminar
                    </Button>
                  </div>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
