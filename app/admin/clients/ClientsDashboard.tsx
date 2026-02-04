"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ThemedSelect } from "@/components/ui/themed-select";
import type { Client } from "@/lib/db";

import ClientsList from "./ClientsList";

const statusOptions = [
  { value: "new", label: "Nuevo" },
  { value: "active", label: "Activo" },
  { value: "vip", label: "VIP" },
  { value: "archived", label: "Archivado" },
];

type HistoryEntry = {
  type: "contract" | "trip";
  label: string;
  href: string;
  date: string;
  timestamp: number;
};

type ClientsDashboardProps = {
  clients: Client[];
  historyByKey: Record<string, HistoryEntry[]>;
  createAction: (formData: FormData) => void | Promise<void>;
  updateAction: (formData: FormData) => void | Promise<void>;
  deleteAction: (formData: FormData) => void | Promise<void>;
  bulkDeleteAction: (ids: string[]) => Promise<{ ok: boolean; error?: string }>;
  initialQuery?: string;
  initialMissing?: "all" | "phone";
  initialTags?: string;
};

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const hasPhoneDigits = (value: string) => value.replace(/\D/g, "").length >= 7;

export default function ClientsDashboard({
  clients,
  historyByKey,
  createAction,
  updateAction,
  deleteAction,
  bulkDeleteAction,
  initialQuery = "",
  initialMissing = "all",
  initialTags = "",
}: ClientsDashboardProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [missing, setMissing] = useState<"all" | "phone">(initialMissing);
  const [selectedTags, setSelectedTags] = useState<string[]>(() =>
    initialTags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams();
      if (query.trim()) {
        params.set("q", query.trim());
      }
      if (missing === "phone") {
        params.set("missing", "phone");
      }
      if (selectedTags.length) {
        params.set("tags", selectedTags.join(","));
      }
      const qs = params.toString();
      router.replace(qs ? `/admin/clients?${qs}` : "/admin/clients");
    }, 350);
    return () => window.clearTimeout(timer);
  }, [query, missing, selectedTags, router]);

  const availableTags = useMemo(() => {
    const counts = new Map<string, { label: string; count: number }>();
    for (const client of clients) {
      for (const rawTag of client.tags) {
        const trimmed = rawTag.trim();
        if (!trimmed) continue;
        const key = normalizeText(trimmed);
        const entry = counts.get(key);
        if (entry) {
          entry.count += 1;
        } else {
          counts.set(key, { label: trimmed, count: 1 });
        }
      }
    }
    return Array.from(counts.values()).sort((a, b) => b.count - a.count);
  }, [clients]);

  const toggleTag = (tag: string) => {
    setSelectedTags((current) => {
      if (current.includes(tag)) {
        return current.filter((value) => value !== tag);
      }
      return [...current, tag];
    });
  };

  const filteredClients = useMemo(() => {
    const normalizedQuery = normalizeText(query.trim());
    const tokens = normalizedQuery
      .split(",")
      .map((token) => token.trim())
      .filter(Boolean);
    const normalizedSelected = selectedTags.map((tag) => normalizeText(tag));

    return clients.filter((client) => {
      if (missing === "phone" && hasPhoneDigits(client.contact || "")) return false;
      const matchesSelected =
        !normalizedSelected.length ||
        client.tags.some((tag) =>
          normalizedSelected.includes(normalizeText(tag))
        );
      if (!tokens.length) return matchesSelected;
      const nameValue = normalizeText(client.name);
      const matchesName = tokens.some((token) => nameValue.includes(token));
      const matchesTag = client.tags.some((tag) =>
        tokens.some((token) => normalizeText(tag).includes(token))
      );
      return matchesSelected && (matchesName || matchesTag);
    });
  }, [clients, missing, query, selectedTags]);

  return (
    <>
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
              Buscar por nombre o etiqueta
            </label>
            <input
              name="q"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
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
              value={missing}
              onChange={(value) => setMissing(value === "phone" ? "phone" : "all")}
              options={[
                { value: "all", label: "Todos" },
                { value: "phone", label: "Sin teléfono" },
              ]}
              className="w-44"
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setQuery("");
              setMissing("all");
              setSelectedTags([]);
            }}
          >
            Limpiar filtros
          </Button>
        </div>
        {availableTags.length ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              Etiquetas populares
            </span>
            {availableTags.slice(0, 16).map((tag) => {
              const active = selectedTags.includes(tag.label);
              return (
                <button
                  key={tag.label}
                  type="button"
                  onClick={() => toggleTag(tag.label)}
                  className={[
                    "rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] transition",
                    active
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-brand-200 text-brand-600 hover:border-brand-300 hover:text-brand-700",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {tag.label}
                </button>
              );
            })}
          </div>
        ) : null}
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
            <form action={createAction} className="grid gap-4 md:grid-cols-2">
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
                <ThemedSelect name="status" defaultValue="new" options={statusOptions} />
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
        updateAction={updateAction}
        deleteAction={deleteAction}
        bulkDeleteAction={bulkDeleteAction}
      />
    </>
  );
}
