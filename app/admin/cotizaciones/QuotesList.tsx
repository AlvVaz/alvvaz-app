"use client";

import { useEffect, useRef, useState } from "react";
import type { SyntheticEvent } from "react";

import type { QuoteListItem, QuoteRecord } from "@/lib/quotes/types";

import { QuoteEditor } from "./QuoteEditor";

type QuotesListProps = {
  initialQuotes: QuoteListItem[];
  currentAdminName: string;
  initialNextFolio: number | null;
};

const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const getCreatorInitials = (value?: string | null) => {
  const cleaned = value?.trim();
  if (!cleaned) return "—";
  const base = cleaned.split("@")[0]?.trim() ?? cleaned;
  const tokens = base.split(/[\s._-]+/).filter(Boolean);
  if (tokens.length === 0) return "—";
  if (tokens.length === 1) {
    return tokens[0].slice(0, 2).toUpperCase();
  }
  return `${tokens[0][0]}${tokens[1][0]}`.toUpperCase();
};

export function QuotesList({ initialQuotes, currentAdminName, initialNextFolio }: QuotesListProps) {
  const [quotes, setQuotes] = useState(initialQuotes);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [newEditorKey, setNewEditorKey] = useState(0);
  const [nextFolio, setNextFolio] = useState(initialNextFolio);
  // Editors mount only while their card is open, so closed cards don't render a preview.
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const isFirstRun = useRef(true);

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/admin/quotes?search=${encodeURIComponent(search)}`, {
          signal: controller.signal,
        });
        const payload = await response.json();
        if (response.ok) setQuotes(payload.quotes ?? []);
      } catch {
        // Aborted or offline: keep the current list.
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [search]);

  const handleCreated = (quote: QuoteRecord) => {
    setQuotes((current) => [{ ...quote, createdByName: currentAdminName }, ...current]);
    setIsNewOpen(false);
    setNewEditorKey((key) => key + 1);
    setNextFolio(quote.folio + 1);
  };

  const handleUpdated = (quote: QuoteRecord) => {
    setQuotes((current) =>
      current.map((item) => (item.id === quote.id ? { ...item, ...quote } : item))
    );
  };

  const handleDeleted = (id: string) => {
    setQuotes((current) => current.filter((item) => item.id !== id));
    setOpenIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  };

  const handleCardToggle = (id: string) => (event: SyntheticEvent<HTMLDetailsElement>) => {
    const isOpen = event.currentTarget.open;
    setOpenIds((current) => {
      if (current.has(id) === isOpen) return current;
      const next = new Set(current);
      if (isOpen) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  return (
    <>
      <section className="rounded-3xl border border-brand-200/70 bg-brand-100/70 shadow-sm">
        <details
          className="group"
          open={isNewOpen}
          onToggle={(event) => setIsNewOpen(event.currentTarget.open)}
        >
          <summary className="cursor-pointer list-none px-6 py-4 [&::-webkit-details-marker]:hidden">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-lg text-brand-950">Nueva cotización</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Llena los datos del viaje; el PDF se genera al guardar.
                </p>
              </div>
              <span className="rounded-full border border-brand-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
                Agregar
              </span>
            </div>
          </summary>
          {isNewOpen ? (
            <div className="border-t border-slate-200 px-6 py-4">
              <QuoteEditor
                key={newEditorKey}
                initialQuote={null}
                currentAdminName={currentAdminName}
                nextFolio={nextFolio}
                embedded
                onSaved={handleCreated}
              />
            </div>
          ) : null}
        </details>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="font-display text-lg text-brand-950">Buscar cotizaciones</h3>
        <p className="mt-1 text-sm text-slate-600">Busca por folio, cliente u hotel.</p>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="#1000, cliente u hotel"
          aria-label="Buscar cotizaciones"
          className="mt-4 w-full max-w-md rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-200"
        />
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="font-display text-lg text-brand-950">Cotizaciones</h3>
          <span className="inline-flex h-8 items-center rounded-full border border-brand-200 px-3 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
            {quotes.length} cotizaciones
          </span>
        </div>

        {quotes.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-brand-200 bg-white/60 p-6 text-sm text-slate-600">
            {search ? "No hay cotizaciones que coincidan." : "Aún no hay cotizaciones."}
          </div>
        ) : (
          <div className={`grid gap-4 ${isLoading ? "opacity-60" : ""}`}>
            {quotes.map((quote) => (
              <details
                key={quote.id}
                id={`quote-${quote.id}`}
                onToggle={handleCardToggle(quote.id)}
                className="rounded-3xl border border-transparent bg-transparent shadow-none"
              >
                <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  <div className="rounded-[28px] border border-brand-200/80 bg-gradient-to-br from-white via-brand-50 to-brand-200/60 px-6 py-3 text-brand-950 shadow-[0_12px_28px_rgba(77,143,224,0.16)]">
                    <div className="grid items-center gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                          Cotización
                        </p>
                        <p className="font-display text-lg text-brand-950">#{quote.folio}</p>
                        <p className="text-xs text-brand-700/80">
                          {dateFormatter.format(new Date(quote.createdAt))}
                        </p>
                      </div>
                      <div className="flex flex-col items-center gap-2 text-center">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                          Admin
                        </p>
                        {quote.createdByName ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className="rounded-xl border border-brand-200 bg-white/80 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700 shadow-sm">
                              {getCreatorInitials(quote.createdByName)}
                            </span>
                            <span
                              className="max-w-[120px] truncate text-[10px] uppercase tracking-[0.18em] text-brand-700/70"
                              title={quote.createdByName}
                            >
                              {quote.createdByName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Sin asignar</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                          Cliente
                        </p>
                        <p className="truncate text-sm text-brand-900">{quote.clientName}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                          Hotel
                        </p>
                        <p className="truncate text-sm text-brand-900">{quote.hotelName}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                          Fechas de viaje
                        </p>
                        <p className="text-sm text-brand-700/80">{quote.data.travelDates || "—"}</p>
                      </div>
                    </div>
                  </div>
                </summary>

                {openIds.has(quote.id) ? (
                  <div className="border-t border-slate-200 px-6 py-4">
                    <QuoteEditor
                      initialQuote={quote}
                      currentAdminName={currentAdminName}
                      embedded
                      onSaved={handleUpdated}
                      onDeleted={handleDeleted}
                    />
                  </div>
                ) : null}
              </details>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
