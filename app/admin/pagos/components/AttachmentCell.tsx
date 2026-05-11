"use client";

import { ChangeEvent, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import type { ContractTransaction, TransactionAttachment } from "@/types/transactions";

type AttachmentCellProps = {
  transaction: ContractTransaction;
  onChanged: () => Promise<void>;
};

function getAttachmentLabel(attachment: TransactionAttachment) {
  if (attachment.mimeType?.includes("pdf")) return "PDF";
  if (attachment.mimeType?.startsWith("image/")) return "IMG";
  return "FILE";
}

export function AttachmentCell({ transaction, onChanged }: AttachmentCellProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setBusy(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`/api/transactions/${transaction.id}/attachments`, {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "No se pudo subir el comprobante.");
      }
      await onChanged();
    } catch (uploadError) {
      setError((uploadError as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const openAttachment = async (attachment: TransactionAttachment) => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/transactions/${transaction.id}/attachments/${attachment.id}/signed-url`,
        { cache: "no-store" }
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "No se pudo abrir el comprobante.");
      }
      window.open(payload.signedUrl, "_blank", "noopener,noreferrer");
    } catch (openError) {
      setError((openError as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const deleteAttachment = async (attachment: TransactionAttachment) => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/transactions/${transaction.id}/attachments/${attachment.id}`,
        { method: "DELETE" }
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "No se pudo eliminar el comprobante.");
      }
      await onChanged();
    } catch (deleteError) {
      setError((deleteError as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {transaction.attachments.map((attachment) => (
          <span key={attachment.id} className="group relative inline-flex">
            <button
              type="button"
              onClick={() => openAttachment(attachment)}
              disabled={busy}
              title={attachment.fileName}
              className="flex h-7 min-w-7 items-center justify-center rounded-md border border-slate-200 bg-slate-50 px-2 text-[10px] font-bold text-brand-700 transition hover:border-brand-300 hover:bg-brand-50"
            >
              {getAttachmentLabel(attachment)}
            </button>
            <button
              type="button"
              onClick={() => deleteAttachment(attachment)}
              disabled={busy}
              className={cn(
                "absolute -right-2 -top-2 hidden h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-xs font-bold text-white shadow-sm",
                "group-hover:flex"
              )}
              aria-label={`Eliminar ${attachment.fileName}`}
            >
              ×
            </button>
          </span>
        ))}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-dashed border-brand-300 text-base font-semibold leading-none text-brand-700 transition hover:bg-brand-50 disabled:cursor-wait disabled:opacity-60"
          aria-label="Adjuntar comprobante"
        >
          +
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={handleUpload}
        accept="image/*,application/pdf"
      />

      {error ? <p className="max-w-[260px] text-xs text-rose-700">{error}</p> : null}
    </div>
  );
}
