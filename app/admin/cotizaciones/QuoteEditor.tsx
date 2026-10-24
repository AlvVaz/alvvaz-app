"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { applyDerivedFields } from "@/lib/quotes/derived";
import {
  hiddenSectionFields,
  isSectionVisible,
  QUOTE_SECTION_LABELS,
  setSectionHidden,
} from "@/lib/quotes/open";
import {
  buildQuotePdfFileName,
  createEmptyQuoteData,
  createQuoteDataFrom,
  formatQuoteDate,
  getMinorAges,
  getQuoteSaveError,
  isQuoteFieldOptional,
  QUOTE_HIDDEN_FIELDS,
  QUOTE_OPTIONAL_FIELDS,
  QUOTE_TEXT_FIELDS,
  type QuoteData,
  type QuoteKind,
  type QuoteRecord,
  type QuoteTextField,
} from "@/lib/quotes/types";

import { QuotePreview, type QuoteZoom } from "./QuotePreview";

// Edits are autosaved as a borrador this long after the last change, and right away when
// leaving (closing or reloading the tab, another page, closing the card): nothing is lost.
const DRAFT_DELAY = 1500;

// Zoom of the template in the editor: fits the width until − / + pick a size, which is
// remembered in this browser and shared by every open editor. Kept outside React so it
// survives remounts; an unavailable localStorage (private window, blocked storage) just
// means it isn't remembered.
const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5];
const ZOOM_STORAGE_KEY = "alvvaz-quote-zoom";
const zoomListeners = new Set<() => void>();
let currentZoom: QuoteZoom | null = null;

function readZoom(): QuoteZoom {
  if (currentZoom === null) {
    currentZoom = "fit";
    try {
      const stored = window.localStorage.getItem(ZOOM_STORAGE_KEY);
      if (stored && ZOOM_STEPS.includes(Number(stored))) currentZoom = Number(stored);
    } catch {
      // Not remembered.
    }
  }
  return currentZoom;
}

function setStoredZoom(zoom: QuoteZoom) {
  currentZoom = zoom;
  try {
    window.localStorage.setItem(ZOOM_STORAGE_KEY, String(zoom));
  } catch {
    // Not remembered.
  }
  zoomListeners.forEach((listener) => listener());
}

function subscribeZoom(listener: () => void) {
  zoomListeners.add(listener);
  return () => {
    zoomListeners.delete(listener);
  };
}

type QuoteEditorProps = {
  initialQuote: QuoteRecord | null;
  // Shown as Vendedor on a new quote; the server sets the real value on save.
  currentAdminName?: string;
  // Expected folio for a new quote, shown until the DB assigns the real one.
  nextFolio?: number | null;
  // Only passed for owner/tech: lets them pick another admin as Vendedor.
  vendorOptions?: string[];
  // Type picked for a new quote (ignored when editing a saved one).
  kind?: QuoteKind;
  // Earlier quote of the same type a new quote starts from (see createQuoteDataFrom).
  draftData?: QuoteData | null;
  // Embedded in the list page: no page header, and the parent handles save/delete instead of navigation.
  embedded?: boolean;
  onSaved?: (quote: QuoteRecord, isNew: boolean) => void;
  onDeleted?: (id: string) => void;
  // After each autosave; isNew = a new quote just got its folio as a borrador. Can come after
  // the editor closed (the last borrador is sent while leaving).
  onDraftSaved?: (quote: QuoteRecord, isNew: boolean) => void;
};

const LOCKED_FIELDS: QuoteTextField[] = ["vendorName"];
// Filled with today's date on a new quote; no box needed.
const PLAIN_FIELDS: QuoteTextField[] = ["quoteDate"];

// Fields counted in "Faltan X de Y"; optional ones (client phone) don't count, and
// neither does Reserva con, which is calculated from Mínimo por persona and can't be typed.
const REQUIRED_FIELDS = QUOTE_TEXT_FIELDS.filter(
  (field) => !QUOTE_OPTIONAL_FIELDS.includes(field) && field !== "depositTotal"
);

type SaveResponse = { quote?: QuoteRecord; pdfError?: string; error?: string };

const pillButtonClass =
  "inline-flex items-center gap-2 rounded-full border border-brand-200 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-700 transition hover:border-brand-400 disabled:opacity-50";

export function QuoteEditor({
  initialQuote,
  currentAdminName = "",
  nextFolio = null,
  vendorOptions,
  kind = "aereo",
  draftData = null,
  embedded = false,
  onSaved,
  onDeleted,
  onDraftSaved,
}: QuoteEditorProps) {
  const router = useRouter();
  const toast = useToast();
  const { confirm, dialog } = useConfirmDialog();

  const [quote, setQuote] = useState<QuoteRecord | null>(initialQuote);
  // A saved quote opens on its borrador when it has one.
  const [data, setData] = useState<QuoteData>(
    () =>
      initialQuote?.draftData ??
      initialQuote?.data ?? {
        ...(draftData ? createQuoteDataFrom(draftData) : createEmptyQuoteData(kind)),
        vendorName: currentAdminName,
        quoteDate: formatQuoteDate(new Date()),
      }
  );
  // Changes not saved for real yet (a borrador counts: its PDF isn't up to date).
  const [isDirty, setIsDirty] = useState(() => Boolean(initialQuote?.status === "draft" || initialQuote?.draftData));
  const [busy, setBusy] = useState<"save" | "pdf" | "send" | "delete" | "discard" | null>(null);
  const [draftSave, setDraftSave] = useState<{ state: "saving" | "saved" | "error"; at?: Date } | null>(null);
  // Bumped on every edit; the autosave waits DRAFT_DELAY after the last one.
  const [changeCount, setChangeCount] = useState(0);
  const isDraftQuote = quote?.status === "draft";
  const hasSavedDraft = Boolean(quote && !isDraftQuote && quote.draftData);

  // For the autosave, which runs outside renders (timers, page events, after unmount).
  const dataRef = useRef(data);
  const quoteRef = useRef(quote);
  const onDraftSavedRef = useRef(onDraftSaved);
  // Edits not sent as a borrador yet.
  const pendingRef = useRef(false);
  // A real save (or discarding the borrador) is running: the autosave waits.
  const savingRef = useRef(false);
  const mountedRef = useRef(true);
  // Borrador saves run one after another, so a new quote is created once and then updated.
  const draftChainRef = useRef<Promise<void>>(Promise.resolve());
  useEffect(() => {
    dataRef.current = data;
    onDraftSavedRef.current = onDraftSaved;
  });

  const showQuote = (next: QuoteRecord) => {
    quoteRef.current = next;
    setQuote(next);
  };

  const sendDraft = useCallback(async (keepalive: boolean) => {
    if (!pendingRef.current || savingRef.current) return;
    pendingRef.current = false;
    const current = quoteRef.current;
    if (mountedRef.current) setDraftSave({ state: "saving" });
    try {
      const response = await fetch(current ? `/api/admin/quotes/${current.id}` : "/api/admin/quotes", {
        method: current ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: dataRef.current, draft: true }),
        // Lets the request finish while the page is closing.
        keepalive,
      });
      const payload = (await response.json().catch(() => ({}))) as SaveResponse;
      if (!response.ok || !payload.quote) throw new Error(payload.error);
      quoteRef.current = payload.quote;
      if (mountedRef.current) {
        setQuote(payload.quote);
        setDraftSave({ state: "saved", at: new Date() });
      }
      onDraftSavedRef.current?.(payload.quote, !current);
    } catch {
      // Still pending: the next edit, or leaving, tries again.
      pendingRef.current = true;
      if (mountedRef.current) setDraftSave({ state: "error" });
    }
  }, []);

  const queueDraft = useCallback(
    (keepalive: boolean) => {
      draftChainRef.current = draftChainRef.current.then(() => sendDraft(keepalive));
      return draftChainRef.current;
    },
    [sendDraft]
  );

  useEffect(() => {
    if (!changeCount) return;
    const timer = setTimeout(() => void queueDraft(false), DRAFT_DELAY);
    return () => clearTimeout(timer);
  }, [changeCount, queueDraft]);

  // Leaving: closing or reloading the tab (pagehide), switching away from it (the browser may
  // discard it), or this editor closing (its card, another page of the list or of the app).
  useEffect(() => {
    mountedRef.current = true;
    const flush = () => void queueDraft(true);
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", handleVisibility);
      mountedRef.current = false;
      flush();
    };
  }, [queueDraft]);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  // The server renders "fit"; the browser then switches to the remembered zoom.
  const zoom = useSyncExternalStore(subscribeZoom, readZoom, () => "fit" as QuoteZoom);
  const [scale, setScale] = useState(1);
  // − / + go to the next step from the current size (also from the fit-to-width start).
  const zoomOut = ZOOM_STEPS.filter((step) => step < scale - 0.01).at(-1);
  const zoomIn = ZOOM_STEPS.find((step) => step > scale + 0.01);

  // Each option counts its hotel, price, room and stars; each menor counts its age. Fields this
  // type doesn't show (e.g. internacional's flight times) don't count, nor do Abierta's optional
  // ones (people, times) and the ones only shown in a section it hides.
  const sectionFields = data.open ? hiddenSectionFields(data.open) : [];
  const requiredFields = REQUIRED_FIELDS.filter(
    (field) =>
      !QUOTE_HIDDEN_FIELDS[data.kind].includes(field) &&
      !isQuoteFieldOptional(data.kind, field) &&
      !sectionFields.includes(field)
  );
  const minorAges = getMinorAges(data);
  // Abierta options count hotel, stars and at least one category price (their cards have no room or plan).
  const optionsShown = isSectionVisible(data.open, "options");
  const fieldsPerOption = data.open ? 3 : 4;
  const missingCount =
    requiredFields.filter((field) => !data[field].trim()).length +
    (optionsShown
      ? data.options.reduce(
          (count, option) =>
            count +
            (option.hotelName.trim() ? 0 : 1) +
            (option.stars ? 0 : 1) +
            (data.open
              ? option.rates?.some((rate) => rate.price.trim())
                ? 0
                : 1
              : (option.totalPrice.trim() ? 0 : 1) + (option.roomType.trim() ? 0 : 1)),
          0
        )
      : 0) +
    minorAges.filter((age) => !age.trim()).length;
  const totalCount =
    requiredFields.length + (optionsShown ? data.options.length * fieldsPerOption : 0) + minorAges.length;

  const fileName = quote ? buildQuotePdfFileName(quote.folio, quote.data) : "COTIZACION.pdf";
  const pdfUrl = quote ? `/api/admin/quotes/${quote.id}/pdf` : null;

  const handleChange = (next: QuoteData) => {
    setData((previous) => applyDerivedFields(previous, next));
    setIsDirty(true);
    pendingRef.current = true;
    setChangeCount((count) => count + 1);
  };

  const handleSave = async () => {
    const saveError = getQuoteSaveError(data);
    if (saveError) {
      setError(saveError);
      return;
    }
    setBusy("save");
    setError(null);
    savingRef.current = true;
    try {
      // A borrador still on its way finishes first, so a new quote isn't created twice.
      await draftChainRef.current;
      const current = quoteRef.current;
      const response = await fetch(current ? `/api/admin/quotes/${current.id}` : "/api/admin/quotes", {
        method: current ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });
      const payload = (await response.json().catch(() => ({}))) as SaveResponse;
      if (!response.ok || !payload.quote) {
        setError(payload.error || "No se pudo guardar la cotización.");
        return;
      }

      // Saved for real: no borrador left.
      pendingRef.current = false;
      setDraftSave(null);
      showQuote(payload.quote);
      setData(payload.quote.data);
      setIsDirty(false);
      if (payload.pdfError) {
        setError(payload.pdfError);
        toast.push(payload.pdfError, "error");
      } else {
        toast.push(`Cotización #${payload.quote.folio} guardada.`);
      }
      if (embedded) {
        onSaved?.(payload.quote, !current);
        return;
      }
      if (!current) {
        router.replace(`/admin/cotizaciones/${payload.quote.id}`);
      }
      router.refresh();
    } catch {
      setError("No se pudo guardar la cotización.");
    } finally {
      savingRef.current = false;
      setBusy(null);
    }
  };

  // A saved quote's borrador: back to the last saved version (and its PDF).
  const handleDiscardDraft = () => {
    if (!quote) return;
    confirm(
      `¿Descartar el borrador de la cotización #${quote.folio}? Vuelve a como estaba guardada.`,
      async () => {
        setBusy("discard");
        setError(null);
        savingRef.current = true;
        try {
          await draftChainRef.current;
          const response = await fetch(`/api/admin/quotes/${quote.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ discardDraft: true }),
          });
          const payload = (await response.json().catch(() => ({}))) as SaveResponse;
          if (!response.ok || !payload.quote) {
            setError(payload.error || "No se pudo descartar el borrador.");
            return;
          }
          pendingRef.current = false;
          setDraftSave(null);
          showQuote(payload.quote);
          setData(payload.quote.data);
          setIsDirty(false);
          onSaved?.(payload.quote, false);
          toast.push(`Borrador de la cotización #${quote.folio} descartado.`);
        } catch {
          setError("No se pudo descartar el borrador.");
        } finally {
          savingRef.current = false;
          setBusy(null);
        }
      },
      { title: "Descartar borrador", confirmLabel: "Descartar", cancelLabel: "Cancelar", tone: "danger" }
    );
  };

  const handleRegeneratePdf = async () => {
    if (!quote) return;
    setBusy("pdf");
    setError(null);
    // Generation takes a few seconds; confirm the click right away.
    toast.push(`Generando PDF de la cotización #${quote.folio}...`, "info");
    try {
      const response = await fetch(`/api/admin/quotes/${quote.id}/pdf`, { method: "POST" });
      const payload = (await response.json().catch(() => ({}))) as SaveResponse;
      if (!response.ok || !payload.quote) {
        const message = payload.error || "No se pudo generar el PDF.";
        setError(message);
        toast.push(message, "error");
        return;
      }
      showQuote(payload.quote);
      onSaved?.(payload.quote, false);
      toast.push(`PDF de la cotización #${payload.quote.folio} listo.`);
    } catch {
      setError("No se pudo generar el PDF.");
      toast.push("No se pudo generar el PDF.", "error");
    } finally {
      setBusy(null);
    }
  };

  const handleOpenPdf = () => {
    if (!pdfUrl) return;
    window.open(pdfUrl, "_blank", "noopener,noreferrer");
  };

  const handleSendPdf = async () => {
    if (!pdfUrl || !quote) return;
    setBusy("send");
    setError(null);
    try {
      const response = await fetch(pdfUrl);
      if (!response.ok) {
        setError("No se pudo descargar el PDF.");
        return;
      }
      const blob = await response.blob();
      const file = new File([blob], fileName, { type: "application/pdf" });

      if (typeof navigator !== "undefined" && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: `Cotización #${quote.folio}`, text: "Cotización adjunta" });
          toast.push("PDF listo para enviar.");
          return;
        } catch (shareError) {
          if (shareError instanceof DOMException && shareError.name === "AbortError") return;
        }
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      const message = `Adjunto cotización #${quote.folio} (${quote.data.title || quote.hotelName}).`;
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
      toast.push("PDF descargado. Adjunta el archivo en WhatsApp.");
    } catch {
      setError("No se pudo preparar el envío.");
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = () => {
    if (!quote) return;
    confirm(
      `¿Eliminar la cotización #${quote.folio}? También se borra su PDF.`,
      async () => {
        setBusy("delete");
        setError(null);
        try {
          const response = await fetch(`/api/admin/quotes/${quote.id}`, { method: "DELETE" });
          if (!response.ok) {
            const payload = (await response.json().catch(() => ({}))) as SaveResponse;
            setError(payload.error || "No se pudo eliminar la cotización.");
            return;
          }
          // Gone: nothing left to autosave when the editor closes.
          pendingRef.current = false;
          toast.push(`Cotización #${quote.folio} eliminada.`);
          if (embedded) {
            onDeleted?.(quote.id);
            return;
          }
          router.push("/admin/cotizaciones");
          router.refresh();
        } catch {
          setError("No se pudo eliminar la cotización.");
        } finally {
          setBusy(null);
        }
      },
      { title: "Eliminar cotización", confirmLabel: "Eliminar", cancelLabel: "Cancelar", tone: "danger" }
    );
  };

  return (
    <div className="space-y-6">
      {dialog}
      <div className={`flex flex-wrap items-center gap-4 ${embedded ? "justify-end" : "justify-between"}`}>
        {embedded ? null : (
          <div>
            <Link
              href="/admin/cotizaciones"
              className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 hover:text-brand-700"
            >
              ← Cotizaciones
            </Link>
            <h1 className="mt-2 font-display text-3xl font-semibold text-brand-950">
              {quote && !isDraftQuote ? `Cotización #${quote.folio}` : quote ? `Borrador #${quote.folio}` : "Nueva cotización"}
            </h1>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          {quote ? (
            <>
              {quote.storagePath ? (
                <>
                  <button type="button" onClick={handleOpenPdf} className={pillButtonClass}>
                    Ver PDF
                  </button>
                  <button
                    type="button"
                    onClick={handleSendPdf}
                    disabled={busy !== null}
                    className={pillButtonClass}
                  >
                    {busy === "send" ? "Enviando..." : "Enviar"}
                  </button>
                </>
              ) : null}
              {hasSavedDraft ? (
                <button
                  type="button"
                  onClick={handleDiscardDraft}
                  disabled={busy !== null}
                  className={`${pillButtonClass} border-amber-300 text-amber-800 hover:border-amber-500`}
                >
                  {busy === "discard" ? "Descartando..." : "Descartar borrador"}
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleRegeneratePdf}
                disabled={busy !== null || isDirty || isDraftQuote}
                title={isDirty || isDraftQuote ? "Guarda los cambios primero" : undefined}
                className={pillButtonClass}
              >
                {busy === "pdf" ? "Generando..." : "Generar PDF"}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={busy !== null}
                className={`${pillButtonClass} border-rose-200 text-rose-600 hover:border-rose-400`}
              >
                {busy === "delete" ? "Eliminando..." : "Eliminar"}
              </button>
            </>
          ) : null}
          <Button type="button" onClick={handleSave} disabled={busy !== null}>
            {busy === "save" ? "Guardando..." : quote && !isDraftQuote ? "Guardar cambios" : "Guardar"}
          </Button>
        </div>
      </div>

      {error ? (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
      ) : null}
      {/* Borrador: autosaved, not saved for real yet (no PDF, or the PDF is the last saved version). */}
      {isDirty ? (
        <p className="flex flex-wrap items-center gap-2 text-xs text-amber-800">
          <span className="rounded-full border border-amber-300 bg-amber-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em]">
            Borrador
          </span>
          {draftSave?.state === "saving"
            ? "Guardando borrador..."
            : draftSave?.state === "error"
              ? "No se pudo guardar el borrador; se vuelve a intentar con el próximo cambio o al salir."
              : draftSave?.state === "saved" && draftSave.at
                ? `Guardado como borrador a las ${draftSave.at.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false })}.`
                : isDraftQuote || hasSavedDraft
                  ? "Guardado como borrador."
                  : "Los cambios se guardan solos como borrador."}{" "}
          {hasSavedDraft || (quote && !isDraftQuote)
            ? "El PDF sigue siendo el de la última versión guardada hasta que guardes."
            : "El PDF se genera al guardar."}
        </p>
      ) : null}
      {quote && !quote.storagePath && !isDirty ? (
        <p className="text-xs text-slate-500">Aún no se genera PDF.</p>
      ) : null}

      <div className="mx-auto max-w-[1224px] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-full border border-brand-200 bg-white p-1" role="tablist">
              {(["edit", "preview"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={mode === value}
                  onClick={() => setMode(value)}
                  className={`rounded-full px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] transition ${
                    mode === value ? "bg-brand-950 text-white" : "text-brand-700 hover:text-brand-950"
                  }`}
                >
                  {value === "edit" ? "Editar" : "Vista previa"}
                </button>
              ))}
            </div>
            {/* Editor only: how big the template shows here. The PDF is always real size. */}
            <div className="inline-flex items-center gap-2 text-brand-700">
              <button
                type="button"
                onClick={() => zoomOut !== undefined && setStoredZoom(zoomOut)}
                disabled={zoomOut === undefined}
                aria-label="Alejar"
                title="Alejar"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-brand-200 bg-white shadow-sm transition hover:border-brand-400 hover:bg-brand-200/40 disabled:opacity-40 disabled:hover:border-brand-200 disabled:hover:bg-white"
              >
                <Minus aria-hidden="true" strokeWidth={2.25} className="h-5 w-5" />
              </button>
              <span className="w-14 text-center text-sm font-semibold tabular-nums" aria-live="polite">
                {Math.round(scale * 100)}%
              </span>
              <button
                type="button"
                onClick={() => zoomIn !== undefined && setStoredZoom(zoomIn)}
                disabled={zoomIn === undefined}
                aria-label="Acercar"
                title="Acercar"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-brand-200 bg-white shadow-sm transition hover:border-brand-400 hover:bg-brand-200/40 disabled:opacity-40 disabled:hover:border-brand-200 disabled:hover:bg-white"
              >
                <Plus aria-hidden="true" strokeWidth={2.25} className="h-5 w-5" />
              </button>
            </div>
          </div>
          {mode === "edit" ? (
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
              <span className="inline-flex items-center gap-2">
                <span className="h-0.5 w-4 rounded-full bg-[#e2b203]" />
                Falta
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-0.5 w-4 rounded-full bg-[#22a06b]" />
                Listo
              </span>
              <span className="font-semibold text-brand-900">
                {missingCount ? `Faltan ${missingCount} de ${totalCount}` : "Todo completo"}
              </span>
            </div>
          ) : null}
        </div>
        {/* Abierta: sections hidden with the eye button, click one to show it again. */}
        {mode === "edit" && data.open?.layout.hidden.length ? (
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span className="font-semibold uppercase tracking-[0.18em] text-brand-600">Secciones ocultas</span>
            {data.open.layout.hidden.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => data.open && handleChange({ ...data, open: setSectionHidden(data.open, id, false) })}
                title="Mostrar de nuevo"
                className="rounded-full border border-dashed border-brand-400 bg-white px-3 py-1 font-semibold text-brand-700 transition hover:border-brand-500 hover:bg-brand-200/40"
              >
                + {QUOTE_SECTION_LABELS[id]}
              </button>
            ))}
          </div>
        ) : null}
        <QuotePreview
          data={data}
          folio={quote ? String(quote.folio) : nextFolio ? String(nextFolio) : "—"}
          zoom={zoom}
          onScaleChange={setScale}
          onChange={mode === "edit" ? handleChange : undefined}
          lockedFields={LOCKED_FIELDS}
          plainFields={PLAIN_FIELDS}
          vendorOptions={vendorOptions}
        />
      </div>
    </div>
  );
}
