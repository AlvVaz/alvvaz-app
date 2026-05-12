"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import type { ContractTransaction, TransactionAttachment } from "@/types/transactions";

function AttachmentGalleryModal({
  attachments,
  onClose,
  onOpen,
  onDelete,
}: {
  attachments: TransactionAttachment[];
  onClose: () => void;
  onOpen: (attachment: TransactionAttachment) => void;
  onDelete: (attachment: TransactionAttachment) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-96 max-w-2xl space-y-4 rounded-2xl bg-white p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg text-brand-950">Comprobantes ({attachments.length})</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl leading-none text-slate-400 hover:text-slate-600"
          >
            ×
          </button>
        </div>
        <div className="space-y-2 overflow-y-auto">
          {attachments.map((attachment) => (
            <div key={attachment.id} className="group relative">
              <button
                type="button"
                onClick={() => onOpen(attachment)}
                className="w-full truncate rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-left text-sm hover:border-brand-300 hover:bg-brand-50 transition"
                title={attachment.fileName}
              >
                {attachment.fileName}
              </button>
              <button
                type="button"
                onClick={() => onDelete(attachment)}
                className={cn(
                  "absolute -right-2 -top-2 hidden h-6 w-6 items-center justify-center rounded-full bg-rose-600 text-sm font-bold text-white shadow-sm",
                  "group-hover:flex"
                )}
                aria-label={`Eliminar ${attachment.fileName}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

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
  const [galleryOpen, setGalleryOpen] = useState(false);
  const { confirm, dialog } = useConfirmDialog();

  useEffect(() => {
    if (galleryOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [galleryOpen]);

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

  const deleteAttachment = (attachment: TransactionAttachment) => {
    confirm(`¿Eliminar ${attachment.fileName}?`, async () => {
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
    }, { confirmLabel: "Eliminar" });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-dashed border-brand-300 text-base font-semibold leading-none text-brand-700 transition hover:bg-brand-50 disabled:cursor-wait disabled:opacity-60"
          aria-label="Adjuntar comprobante"
        >
          +
        </button>
        {transaction.attachments.length > 0 ? (
          <button
            type="button"
            onClick={() => setGalleryOpen(true)}
            className="text-base font-semibold text-blue-600 hover:text-blue-700 hover:underline transition"
          >
            ({transaction.attachments.length})
          </button>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={handleUpload}
        accept="image/*,application/pdf"
      />

      {galleryOpen && (
        <AttachmentGalleryModal
          attachments={transaction.attachments}
          onClose={() => setGalleryOpen(false)}
          onOpen={openAttachment}
          onDelete={deleteAttachment}
        />
      )}

      {error ? <p className="max-w-[260px] text-xs text-rose-700">{error}</p> : null}
      {dialog}
    </div>
  );
}
