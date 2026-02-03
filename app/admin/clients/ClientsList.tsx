"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { Client } from "@/lib/db";
import { formatTags } from "@/lib/db/utils";
import { Button } from "@/components/ui/button";
import { ThemedSelect } from "@/components/ui/themed-select";

type HistoryEntry = {
  type: "contract" | "trip";
  label: string;
  href: string;
  date: string;
  timestamp: number;
};

type ClientsListProps = {
  clients: Client[];
  historyByKey: Record<string, HistoryEntry[]>;
  updateAction: (formData: FormData) => void | Promise<void>;
  deleteAction: (formData: FormData) => void | Promise<void>;
  bulkDeleteAction: (ids: string[]) => Promise<{ ok: boolean; error?: string }>;
};

const statusOptions = [
  { value: "new", label: "Nuevo" },
  { value: "active", label: "Activo" },
  { value: "vip", label: "VIP" },
  { value: "archived", label: "Archivado" },
];

const normalizeName = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase();
const normalizeContact = (value: string) => value.trim();
const buildKey = (name: string, contact: string) =>
  `${normalizeName(name)}|${normalizeContact(contact)}`;

export default function ClientsList({
  clients,
  historyByKey,
  updateAction,
  deleteAction,
  bulkDeleteAction,
}: ClientsListProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const allSelected = useMemo(
    () => clients.length > 0 && selectedIds.size === clients.length,
    [clients.length, selectedIds]
  );

  const toggleAll = () => {
    setSelectedIds((current) => {
      if (!clients.length) return current;
      if (current.size === clients.length) return new Set();
      return new Set(clients.map((client) => client.id));
    });
  };

  const toggleOne = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBulkDelete = () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    startTransition(async () => {
      const result = await bulkDeleteAction(ids);
      if (result?.ok) {
        setSelectedIds(new Set());
        router.refresh();
      }
    });
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-lg text-brand-950">Listado actual</h3>
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex h-8 items-center rounded-full border border-brand-200 px-3 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
            {clients.length} clientes
          </span>
          <button
            type="button"
            onClick={toggleAll}
            className="inline-flex h-8 items-center rounded-full border border-brand-200 px-3 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700 transition hover:border-brand-300 hover:text-brand-900"
          >
            {allSelected ? "Quitar selección" : "Seleccionar todo"}
          </button>
          <Button
            type="button"
            variant="subtle"
            className="h-8 rounded-full border border-rose-300 bg-rose-50 px-3 text-xs font-semibold uppercase tracking-[0.2em] text-rose-700 shadow-sm hover:border-rose-400 hover:text-rose-800"
            onClick={handleBulkDelete}
            disabled={!selectedIds.size || isPending}
          >
            Eliminar seleccionados
          </Button>
        </div>
      </div>

      {clients.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-brand-200 bg-white/60 p-6 text-sm text-slate-600">
          Aún no hay clientes registrados.
        </div>
      ) : (
        <div className="grid gap-6">
          {clients.map((client) => {
            const historyKey = buildKey(client.name, client.contact);
            const history = (historyByKey[historyKey] ?? [])
              .slice()
              .sort((a, b) => b.timestamp - a.timestamp);

            return (
              <details
                key={client.id}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        aria-label="Seleccionar cliente"
                        checked={selectedIds.has(client.id)}
                        onChange={() => toggleOne(client.id)}
                        onClick={(event) => event.stopPropagation()}
                        className="mt-1 h-4 w-4 rounded border-brand-300 text-brand-600"
                      />
                      <div>
                        <p className="font-display text-lg text-brand-950">{client.name}</p>
                        <p className="text-sm text-slate-600">
                          {client.contact || "Sin teléfono"}
                        </p>
                      </div>
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
                  action={updateAction}
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
                    <ThemedSelect
                      name="status"
                      defaultValue={client.status}
                      options={statusOptions}
                    />
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
                      formAction={deleteAction}
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
  );
}
