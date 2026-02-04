"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  initialTags?: string;
};

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export default function ClientsDashboard({
  clients,
  historyByKey,
  createAction,
  updateAction,
  deleteAction,
  bulkDeleteAction,
  initialQuery = "",
  initialTags = "",
}: ClientsDashboardProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [selectedTags, setSelectedTags] = useState<string[]>(() =>
    initialTags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
  );
  const [tagMenuOpen, setTagMenuOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState("");
  const tagMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (!tagMenuRef.current) return;
      if (!tagMenuRef.current.contains(event.target as Node)) {
        setTagMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams();
      if (query.trim()) {
        params.set("q", query.trim());
      }
      if (selectedTags.length) {
        params.set("tags", selectedTags.join(","));
      }
      const qs = params.toString();
      router.replace(qs ? `/admin/clients?${qs}` : "/admin/clients");
    }, 350);
    return () => window.clearTimeout(timer);
  }, [query, selectedTags, router]);

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

  const filteredTagOptions = useMemo(() => {
    const queryValue = normalizeText(tagSearch.trim());
    if (!queryValue) return availableTags;
    return availableTags.filter((tag) =>
      normalizeText(tag.label).includes(queryValue)
    );
  }, [availableTags, tagSearch]);

  const filteredClients = useMemo(() => {
    const normalizedQuery = normalizeText(query.trim());
    const tokens = normalizedQuery
      .split(",")
      .map((token) => token.trim())
      .filter(Boolean);
    const normalizedSelected = selectedTags.map((tag) => normalizeText(tag));

    return clients.filter((client) => {
      const matchesSelected =
        !normalizedSelected.length ||
        normalizedSelected.every((selected) =>
          client.tags.some((tag) => normalizeText(tag) === selected)
        );
      if (!tokens.length) return matchesSelected;
      const nameValue = normalizeText(client.name);
      const matchesName = tokens.some((token) => nameValue.includes(token));
      const matchesTag = client.tags.some((tag) =>
        tokens.some((token) => normalizeText(tag).includes(token))
      );
      return matchesSelected && (matchesName || matchesTag);
    });
  }, [clients, query, selectedTags]);

  const selectedLabel = useMemo(() => {
    if (!selectedTags.length) return "Todas";
    if (selectedTags.length === 1) return selectedTags[0];
    return `${selectedTags[0]} + ${selectedTags.length - 1}`;
  }, [selectedTags]);

  const toggleTag = (tag: string) => {
    setSelectedTags((current) => {
      if (current.includes(tag)) {
        return current.filter((value) => value !== tag);
      }
      return [...current, tag];
    });
  };

  useEffect(() => {
    if (!tagMenuOpen) {
      setTagSearch("");
    }
  }, [tagMenuOpen]);

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
              placeholder="Empieza a escribir"
              className="w-64 rounded-2xl border border-slate-200 px-4 py-2 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
              Etiquetas
            </label>
            <div ref={tagMenuRef} className="relative w-56">
              <button
                type="button"
                onClick={() => setTagMenuOpen((prev) => !prev)}
                className="flex w-full items-center justify-between rounded-2xl border border-brand-200 bg-white px-4 py-2 text-left text-sm text-brand-900 shadow-sm transition hover:border-brand-300"
              >
                <span className={selectedTags.length ? "text-brand-900" : "text-slate-400"}>
                  {selectedLabel}
                </span>
                <svg
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                  className={[
                    "h-4 w-4 text-slate-500 transition-transform",
                    tagMenuOpen ? "rotate-180" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <path
                    d="M5 7l5 5 5-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              {tagMenuOpen ? (
                <div className="absolute z-30 mt-2 w-full rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
                  <div className="px-2 pb-2">
                    <input
                      value={tagSearch}
                      onChange={(event) => setTagSearch(event.target.value)}
                      placeholder="Filtrar etiquetas..."
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedTags([])}
                    className={[
                      "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition",
                      selectedTags.length === 0
                        ? "bg-brand-100 text-brand-700"
                        : "text-slate-700 hover:bg-brand-50 hover:text-brand-700",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <span>Todas</span>
                    {selectedTags.length === 0 ? (
                      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                        ✓
                      </span>
                    ) : null}
                  </button>
                  <div className="max-h-64 overflow-y-auto">
                    {filteredTagOptions.map((tag) => {
                      const active = selectedTags.includes(tag.label);
                      return (
                        <button
                          key={tag.label}
                          type="button"
                          onClick={() => toggleTag(tag.label)}
                          className={[
                            "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition",
                            active
                              ? "bg-brand-100 text-brand-700"
                              : "text-slate-700 hover:bg-brand-50 hover:text-brand-700",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          <span>{tag.label}</span>
                          {active ? (
                            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                              ✓
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                    {!filteredTagOptions.length ? (
                      <div className="px-3 py-2 text-xs text-slate-400">
                        Sin resultados
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setQuery("");
              setSelectedTags([]);
            }}
          >
            Limpiar filtros
          </Button>
        </div>
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
