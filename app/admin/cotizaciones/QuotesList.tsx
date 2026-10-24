"use client";

import { useEffect, useRef, useState } from "react";
import type { SyntheticEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import {
  QUOTE_KIND_LABELS,
  QUOTE_PAGE_SIZE,
  type QuoteKind,
  type QuoteListPage,
  type QuoteRecord,
} from "@/lib/quotes/types";

import { QuoteEditor } from "./QuoteEditor";

type QuotesListProps = {
  // Page 1 of the list (20 quotes) and the total.
  initialPage: QuoteListPage;
  // Newest quote of each type (latestQuotesByKind): a new quote starts from it.
  initialLatestByKind: Partial<Record<QuoteKind, QuoteRecord>>;
  currentAdminName: string;
  initialNextFolio: number | null;
  // Only set for owner/tech: admins they can pick as Vendedor.
  vendorOptions?: string[];
};

const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const QUOTE_KINDS: QuoteKind[] = ["aereo", "terrestre", "internacional", "abierta"];

// Each type's icon, in the "Agregar" chooser and in the list's Tipo column.
function QuoteKindIcon({ kind }: { kind: QuoteKind }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {kind === "terrestre" ? (
        <>
          <rect x="4" y="3" width="16" height="14" rx="2" />
          <path d="M4 11h16M8 21v-4M16 21v-4" />
          <circle cx="8" cy="14" r="0.5" />
          <circle cx="16" cy="14" r="0.5" />
        </>
      ) : kind === "internacional" ? (
        // Globe
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18" />
          <path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18z" />
        </>
      ) : kind === "abierta" ? (
        // Pencil: every text and section of an Abierta quote can be edited
        <>
          <path d="M13 21h8" />
          <path d="m15 5 4 4" />
          <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
        </>
      ) : (
        <>
          <path d="M2 16l20-6-2-3-7 2-6-5-2 1 4 6-5 1.5-2-2-1.5.5z" />
          <path d="M3 20h18" />
        </>
      )}
    </svg>
  );
}

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

export function QuotesList({
  initialPage,
  initialLatestByKind,
  currentAdminName,
  initialNextFolio,
  vendorOptions,
}: QuotesListProps) {
  // The page being shown (20 quotes, newest folio first) of the whole list or the search.
  const [quotes, setQuotes] = useState(initialPage.quotes);
  const [total, setTotal] = useState(initialPage.total);
  const [page, setPage] = useState(initialPage.page);
  const pageCount = Math.max(1, Math.ceil(total / QUOTE_PAGE_SIZE));
  // Bumped to load the current page again (after a quote is created or deleted).
  const [reloadKey, setReloadKey] = useState(0);
  const lastSearch = useRef("");
  const listRef = useRef<HTMLElement>(null);
  const [latestByKind, setLatestByKind] = useState(initialLatestByKind);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [newEditorKey, setNewEditorKey] = useState(0);
  // "Nueva cotización" first asks for the type; null = the chooser is showing.
  const [newKind, setNewKind] = useState<QuoteKind | null>(null);
  const [nextFolio, setNextFolio] = useState(initialNextFolio);
  // Editors mount only while their card is open, so closed cards don't render a preview.
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const isFirstRun = useRef(true);

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    // Typing waits a moment so each keystroke doesn't fetch; the page arrows load right away.
    const delay = search !== lastSearch.current ? 250 : 0;
    lastSearch.current = search;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/admin/quotes?search=${encodeURIComponent(search)}&page=${page}`, {
          signal: controller.signal,
        });
        const payload = (await response.json()) as Partial<QuoteListPage>;
        if (!response.ok) return;
        const next = payload.quotes ?? [];
        setQuotes(next);
        setTotal(payload.total ?? 0);
        // Past the end (e.g. the last quote of a page was deleted) the server sends the last page.
        if (payload.page && payload.page !== page) setPage(payload.page);
        // Cards that aren't listed anymore close (their editors autosave as they go).
        const listed = new Set(next.map((quote) => quote.id));
        setOpenIds((current) => new Set([...current].filter((id) => listed.has(id))));
      } catch {
        // Aborted or offline: keep the current list.
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }, delay);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [search, page, reloadKey]);

  // Arrows under the list. Open cards on this page close; their editors save a borrador.
  const goToPage = (target: number) => {
    if (target < 1 || target > pageCount || target === page) return;
    setPage(target);
    listRef.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });
  };

  // A new quote starts from the latest one of the chosen type, like new contracts do.
  // Picked once, when the type is chosen, so it doesn't change while the new quote is open.
  const [draftQuote, setDraftQuote] = useState<QuoteRecord | null>(null);
  const startNewQuote = (kind: QuoteKind) => {
    setDraftQuote(latestByKind[kind] ?? null);
    setNewKind(kind);
  };

  const handleCreated = (quote: QuoteRecord) => {
    setLatestByKind((current) => ({ ...current, [quote.data.kind]: quote }));
    // Reload the page: the total changes, and on page 1 the new quote shows at the top.
    setReloadKey((key) => key + 1);
    setIsNewOpen(false);
    setNewKind(null);
    setNewEditorKey((key) => key + 1);
    setNextFolio(quote.folio + 1);
  };

  const handleUpdated = (quote: QuoteRecord) => {
    setQuotes((current) => current.map((item) => (item.id === quote.id ? { ...item, ...quote } : item)));
    setLatestByKind((current) =>
      current[quote.data.kind]?.id === quote.id ? { ...current, [quote.data.kind]: quote } : current
    );
  };

  // The new quote's autosave. Its first borrador gets a folio, so it shows in the list and the
  // next folio moves on; later ones update its card. Can arrive after the panel closed.
  const handleNewDraftSaved = (quote: QuoteRecord, isNew: boolean) => {
    if (isNew) {
      setNextFolio(quote.folio + 1);
      setReloadKey((key) => key + 1);
    } else {
      handleUpdated(quote);
    }
  };

  // The new quote's borrador was deleted from its own panel.
  const handleNewDeleted = () => {
    setIsNewOpen(false);
    setNewKind(null);
    setNewEditorKey((key) => key + 1);
    setReloadKey((key) => key + 1);
  };

  const handleDeleted = (id: string) => {
    setQuotes((current) => current.filter((item) => item.id !== id));
    // A deleted quote isn't copied anymore; a reload finds the next latest.
    setLatestByKind((current) =>
      Object.fromEntries(Object.entries(current).filter(([, quote]) => quote?.id !== id))
    );
    setReloadKey((key) => key + 1);
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
          onToggle={(event) => {
            const isOpen = event.currentTarget.open;
            setIsNewOpen(isOpen);
            // Closing the panel starts over at the type chooser next time (what was typed is
            // already a borrador in the list).
            if (!isOpen) setNewKind(null);
          }}
        >
          {/* Closed: darker blue on hover. Open: the header stays blue so it reads as active. */}
          <summary
            className="cursor-pointer list-none rounded-3xl px-6 py-4 transition-colors duration-200 hover:bg-brand-200/60 group-open:rounded-b-none group-open:bg-brand-200/70 group-open:hover:bg-brand-200 motion-reduce:transition-none [&::-webkit-details-marker]:hidden">
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
          {isNewOpen && !newKind ? (
            <div className="border-t border-slate-200 px-6 py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                Tipo de cotización
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {QUOTE_KINDS.map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => startNewQuote(kind)}
                    className="flex items-center gap-4 rounded-2xl border border-brand-200 bg-white p-5 text-left shadow-sm transition hover:border-brand-400 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-950 text-white">
                      <QuoteKindIcon kind={kind} />
                    </span>
                    <span className="font-display text-lg text-brand-950">{QUOTE_KIND_LABELS[kind]}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {isNewOpen && newKind ? (
            <div className="border-t border-slate-200 px-6 py-4">
              {draftQuote ? (
                <p className="mb-3 text-xs text-slate-500">
                  Copiada de la cotización #{draftQuote.folio}. El cliente y los pasajeros empiezan vacíos.
                </p>
              ) : null}
              <QuoteEditor
                key={newEditorKey}
                initialQuote={null}
                currentAdminName={currentAdminName}
                nextFolio={nextFolio}
                vendorOptions={vendorOptions}
                kind={newKind}
                draftData={draftQuote?.data}
                embedded
                onSaved={handleCreated}
                onDraftSaved={handleNewDraftSaved}
                onDeleted={handleNewDeleted}
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
          // A new search starts on its first page.
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="#1000, cliente u hotel"
          aria-label="Buscar cotizaciones"
          className="mt-4 w-full max-w-md rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-200"
        />
      </section>

      <section ref={listRef} className="scroll-mt-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display text-lg text-brand-950">Cotizaciones</h3>
          {/* All of them (or all the search matches), not just this page. */}
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
            {total} {total === 1 ? "cotización" : "cotizaciones"}
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
                    {/* Six centered columns; the short type name and Admin take less room so the
                        client, hotels and dates get more. */}
                    <div className="grid items-center gap-4 text-center md:grid-cols-[minmax(0,1fr)_minmax(0,0.6fr)_minmax(0,0.8fr)_minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,1.2fr)]">
                      <div className="flex min-w-0 items-center justify-center gap-3 text-left">
                        {/* The type's name is the next column, so the icon is decorative. */}
                        <span
                          aria-hidden="true"
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-950 text-white"
                        >
                          <QuoteKindIcon kind={quote.data.kind} />
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-display text-lg text-brand-950">#{quote.folio}</p>
                            {/* Autosaved, not saved for real: never saved, or a saved one with pending edits. */}
                            {quote.status === "draft" || quote.draftData ? (
                              <span className="rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-amber-800">
                                Borrador
                              </span>
                            ) : null}
                          </div>
                          <p className="text-xs text-brand-700/80">
                            {dateFormatter.format(new Date(quote.createdAt))}
                          </p>
                        </div>
                      </div>
                      <p className="min-w-0 truncate text-sm text-brand-900">{QUOTE_KIND_LABELS[quote.data.kind]}</p>
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
                          Hoteles
                        </p>
                        <p className="truncate text-sm text-brand-900" title={quote.hotelName}>
                          {quote.hotelName}
                        </p>
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
                      vendorOptions={vendorOptions}
                      embedded
                      onSaved={handleUpdated}
                      onDeleted={handleDeleted}
                      onDraftSaved={handleUpdated}
                    />
                  </div>
                ) : null}
              </details>
            ))}
          </div>
        )}

        {pageCount > 1 ? (
          <nav aria-label="Páginas de cotizaciones" className="flex items-center justify-center gap-4 pt-2">
            <button
              type="button"
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1 || isLoading}
              aria-label="Página anterior"
              title="Página anterior"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-brand-200 bg-white text-brand-700 shadow-sm transition hover:border-brand-400 hover:bg-brand-200/40 disabled:opacity-40 disabled:hover:border-brand-200 disabled:hover:bg-white"
            >
              <ChevronLeft aria-hidden="true" strokeWidth={2.25} className="h-5 w-5" />
            </button>
            <span className="text-sm font-semibold tabular-nums text-brand-900" aria-live="polite">
              Página {page} de {pageCount}
            </span>
            <button
              type="button"
              onClick={() => goToPage(page + 1)}
              disabled={page >= pageCount || isLoading}
              aria-label="Página siguiente"
              title="Página siguiente"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-brand-200 bg-white text-brand-700 shadow-sm transition hover:border-brand-400 hover:bg-brand-200/40 disabled:opacity-40 disabled:hover:border-brand-200 disabled:hover:bg-white"
            >
              <ChevronRight aria-hidden="true" strokeWidth={2.25} className="h-5 w-5" />
            </button>
          </nav>
        ) : null}
      </section>
    </>
  );
}
