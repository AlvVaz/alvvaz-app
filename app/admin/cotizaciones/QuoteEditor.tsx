"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { applyDerivedFields } from "@/lib/quotes/derived";
import {
  createEmptyQuoteData,
  formatQuoteDate,
  formatQuoteHotels,
  QUOTE_TEXT_FIELDS,
  type QuoteData,
  type QuoteRecord,
  type QuoteTextField,
} from "@/lib/quotes/types";

import { QuotePreview } from "./QuotePreview";

type QuoteEditorProps = {
  initialQuote: QuoteRecord | null;
  // Shown as Vendedor on a new quote; the server sets the real value on save.
  currentAdminName?: string;
  // Expected folio for a new quote, shown until the DB assigns the real one.
  nextFolio?: number | null;
  // Only passed for owner/tech: lets them pick another admin as Vendedor.
  vendorOptions?: string[];
  // Embedded in the list page: no page header, and the parent handles save/delete instead of navigation.
  embedded?: boolean;
  onSaved?: (quote: QuoteRecord, isNew: boolean) => void;
  onDeleted?: (id: string) => void;
};

const LOCKED_FIELDS: QuoteTextField[] = ["vendorName"];
// Filled with today's date on a new quote; no box needed.
const PLAIN_FIELDS: QuoteTextField[] = ["quoteDate"];

type SaveResponse = { quote?: QuoteRecord; pdfError?: string; error?: string };

const pillButtonClass =
  "inline-flex items-center gap-2 rounded-full border border-brand-200 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-700 transition hover:border-brand-400 disabled:opacity-50";

export function QuoteEditor({
  initialQuote,
  currentAdminName = "",
  nextFolio = null,
  vendorOptions,
  embedded = false,
  onSaved,
  onDeleted,
}: QuoteEditorProps) {
  const router = useRouter();
  const toast = useToast();
  const { confirm, dialog } = useConfirmDialog();

  const [quote, setQuote] = useState<QuoteRecord | null>(initialQuote);
  const [data, setData] = useState<QuoteData>(
    () =>
      initialQuote?.data ?? {
        ...createEmptyQuoteData(),
        vendorName: currentAdminName,
        quoteDate: formatQuoteDate(new Date()),
      }
  );
  const [isDirty, setIsDirty] = useState(false);
  const [busy, setBusy] = useState<"save" | "pdf" | "send" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"edit" | "preview">("edit");

  // Each option counts its hotel, price and stars.
  const missingCount =
    QUOTE_TEXT_FIELDS.filter((field) => !data[field].trim()).length +
    data.options.reduce(
      (count, option) =>
        count + (option.hotelName.trim() ? 0 : 1) + (option.totalPrice.trim() ? 0 : 1) + (option.stars ? 0 : 1),
      0
    );
  const totalCount = QUOTE_TEXT_FIELDS.length + data.options.length * 3;

  const fileName = quote ? `COTIZACION-#${quote.folio}.pdf` : "COTIZACION.pdf";
  const pdfUrl = quote ? `/api/admin/quotes/${quote.id}/pdf` : null;

  const handleChange = (next: QuoteData) => {
    setData((previous) => applyDerivedFields(previous, next));
    setIsDirty(true);
  };

  const handleSave = async () => {
    if (!data.clientName.trim() || !formatQuoteHotels(data)) {
      setError("El cliente y al menos un hotel son obligatorios.");
      return;
    }
    setBusy("save");
    setError(null);
    try {
      const response = await fetch(quote ? `/api/admin/quotes/${quote.id}` : "/api/admin/quotes", {
        method: quote ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });
      const payload = (await response.json().catch(() => ({}))) as SaveResponse;
      if (!response.ok || !payload.quote) {
        setError(payload.error || "No se pudo guardar la cotización.");
        return;
      }

      setQuote(payload.quote);
      setData(payload.quote.data);
      setIsDirty(false);
      if (payload.pdfError) {
        setError(payload.pdfError);
        toast.push(payload.pdfError, "error");
      } else {
        toast.push(`Cotización #${payload.quote.folio} guardada.`);
      }
      if (embedded) {
        onSaved?.(payload.quote, !quote);
        return;
      }
      if (!quote) {
        router.replace(`/admin/cotizaciones/${payload.quote.id}`);
      }
      router.refresh();
    } catch {
      setError("No se pudo guardar la cotización.");
    } finally {
      setBusy(null);
    }
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
      setQuote(payload.quote);
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
              {quote ? `Cotización #${quote.folio}` : "Nueva cotización"}
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
              <button
                type="button"
                onClick={handleRegeneratePdf}
                disabled={busy !== null || isDirty}
                title={isDirty ? "Guarda los cambios primero" : undefined}
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
            {busy === "save" ? "Guardando..." : quote ? "Guardar cambios" : "Guardar"}
          </Button>
        </div>
      </div>

      {error ? (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
      ) : null}
      {quote && isDirty ? (
        <p className="text-xs text-amber-700">
          Hay cambios sin guardar. El PDF se actualiza al guardar.
        </p>
      ) : null}
      {quote && !quote.storagePath && !isDirty ? (
        <p className="text-xs text-slate-500">Aún no se genera PDF.</p>
      ) : null}

      <div className="mx-auto max-w-[1224px] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
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
        <QuotePreview
          data={data}
          folio={quote ? String(quote.folio) : nextFolio ? String(nextFolio) : "—"}
          onChange={mode === "edit" ? handleChange : undefined}
          lockedFields={LOCKED_FIELDS}
          plainFields={PLAIN_FIELDS}
          vendorOptions={vendorOptions}
        />
      </div>
    </div>
  );
}
