"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { supabaseClient } from "@/lib/supabase/client";

import { createPromotionActionWithState } from "./actions";
import { PromotionFields } from "./PromotionFields";

type NewPromotionFormProps = {
  presetTags: string[];
  onCreated?: () => void;
};

const initialState = {
  createdAt: 0,
  promotionId: "",
  error: "",
};

export function NewPromotionForm({ presetTags, onCreated }: NewPromotionFormProps) {
  const [formState, formAction] = useActionState(
    createPromotionActionWithState,
    initialState
  );
  const formRef = useRef<HTMLFormElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [queuedFiles, setQueuedFiles] = useState<File[]>([]);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "done" | "error"
  >("idle");
  const [uploadCount, setUploadCount] = useState(0);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const uploadInFlight = useRef(false);
  const [activePromotionId, setActivePromotionId] = useState("");
  const [pendingCollapse, setPendingCollapse] = useState(false);

  const resetForm = () => {
    formRef.current?.reset();
    setQueuedFiles([]);
    syncFileInput([]);
    setUploadStatus("idle");
    setUploadCount(0);
    setUploadedCount(0);
    setUploadError(null);
    setActivePromotionId("");
    setPendingCollapse(false);
    onCreated?.();
  };

  useEffect(() => {
    if (!formState.createdAt) return;
    if (queuedFiles.length === 0) {
      resetForm();
    } else {
      setPendingCollapse(true);
    }
  }, [formState.createdAt]);

  useEffect(() => {
    if (!pendingCollapse) return;
    if (uploadStatus === "done") {
      resetForm();
    }
  }, [pendingCollapse, uploadStatus]);

  useEffect(() => {
    if (!formState.promotionId || !formState.createdAt) return;
    setActivePromotionId(formState.promotionId);
  }, [formState.promotionId, formState.createdAt]);

  const hasPromotion = Boolean(activePromotionId);

  const progress = useMemo(() => {
    if (!uploadCount) return 0;
    return Math.round((uploadedCount / uploadCount) * 100);
  }, [uploadCount, uploadedCount]);

  const syncFileInput = (nextFiles: File[]) => {
    const input = fileInputRef.current;
    if (!input) return;
    const dataTransfer = new DataTransfer();
    nextFiles.forEach((file) => dataTransfer.items.add(file));
    input.files = dataTransfer.files;
  };

  const uploadQueuedFiles = async (promotionId: string, files: File[]) => {
    if (!promotionId || files.length === 0) return;

    setUploadCount(files.length);
    setUploadedCount(0);
    setUploadStatus("uploading");
    setUploadError(null);

    const bucket =
      process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET_PROMOTIONS || "promotions";

    try {
      const prepResponse = await fetch("/api/admin/promociones/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promotionId,
          files: files.map((file) => ({ name: file.name, type: file.type })),
        }),
      });

      if (!prepResponse.ok) {
        const payload = await prepResponse.json().catch(() => ({}));
        throw new Error(payload.error || "No se pudo preparar la subida.");
      }

      const prepPayload = await prepResponse.json();
      const uploads = (prepPayload.uploads ?? []) as {
        index: number;
        storagePath: string;
        signedUrl: string;
        token: string;
        mime: string;
        originalName: string;
      }[];

      for (const [index, file] of files.entries()) {
        const uploadInfo = uploads.find((upload) => upload.index === index);
        if (!uploadInfo) {
          throw new Error("No se pudo preparar la subida.");
        }

        const { error: uploadError } = await supabaseClient.storage
          .from(bucket)
          .uploadToSignedUrl(uploadInfo.storagePath, uploadInfo.token, file);

        if (uploadError) {
          throw new Error(uploadError.message || "No se pudo subir el archivo.");
        }

        const recordResponse = await fetch("/api/admin/promociones/images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            promotionId,
            storagePath: uploadInfo.storagePath,
          }),
        });

        if (!recordResponse.ok) {
          const payload = await recordResponse.json().catch(() => ({}));
          throw new Error(payload.error || "No se pudo guardar la imagen.");
        }

        setUploadedCount((count) => count + 1);
      }

      setUploadStatus("done");
      setQueuedFiles([]);
      syncFileInput([]);
    } catch (error) {
      setUploadStatus("error");
      setUploadError((error as Error).message || "No se pudo subir. Intenta de nuevo.");
    }
  };

  useEffect(() => {
    if (!hasPromotion || queuedFiles.length === 0 || uploadInFlight.current) return;
    uploadInFlight.current = true;
    uploadQueuedFiles(activePromotionId, queuedFiles).finally(() => {
      uploadInFlight.current = false;
    });
  }, [activePromotionId, hasPromotion, queuedFiles]);

  return (
    <form ref={formRef} action={formAction} className="space-y-6">
      <PromotionFields
        presetTags={presetTags}
        afterDescription={
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                Imágenes
              </p>
              <p className="text-xs text-slate-500">
                Puedes seleccionar imágenes desde ahora. Se subirán al crear la promoción.
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
              onChange={(event) => {
                const nextFiles = Array.from(event.target.files ?? []);
                setQueuedFiles(nextFiles);
              }}
            />

            {queuedFiles.length > 0 ? (
              <div className="space-y-2 rounded-2xl border border-slate-200 bg-white/70 p-3 text-xs text-slate-600">
                {queuedFiles.map((file, index) => (
                  <div key={`${file.name}-${index}`} className="flex items-center justify-between">
                    <span className="truncate">
                      {file.name} · {(file.size / (1024 * 1024)).toFixed(1)} MB
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const next = queuedFiles.filter((_, fileIndex) => fileIndex !== index);
                        setQueuedFiles(next);
                        syncFileInput(next);
                      }}
                      className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500"
                    >
                      X
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
              <span>
                {!hasPromotion && queuedFiles.length > 0
                  ? "Se subirán al crear la promoción."
                  : null}
                {uploadStatus === "uploading" &&
                  `Subiendo ${uploadedCount}/${uploadCount} archivos...`}
                {uploadStatus === "done" && "Imágenes subidas."}
                {uploadStatus === "error" && (uploadError || "No se pudo subir.")}
              </span>
              {uploadStatus === "uploading" ? (
                <div className="flex w-full items-center gap-3">
                  <div className="h-1 w-full rounded-full bg-slate-200">
                    <div
                      className="h-1 rounded-full bg-brand-500 transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-slate-600">{progress}%</span>
                </div>
              ) : null}
            </div>
          </div>
        }
      />

      {formState.error ? (
        <p className="text-sm text-rose-600">{formState.error}</p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        {hasPromotion ? (
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
            Promoción creada · agrega imágenes abajo
          </span>
        ) : (
          <span className="text-xs text-slate-500">
            Completa los datos y luego podrás subir imágenes.
          </span>
        )}
        <Button type="submit">Crear promoción</Button>
      </div>
    </form>
  );
}
