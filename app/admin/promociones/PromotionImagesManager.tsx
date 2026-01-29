"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { supabaseClient } from "@/lib/supabase/client";

type PromotionImage = {
  id: string;
  fileUrl: string;
  storagePath: string | null;
};

type PromotionImagesManagerProps = {
  promotionId: string;
  images: PromotionImage[];
};

export function PromotionImagesManager({
  promotionId,
  images,
}: PromotionImagesManagerProps) {
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">(
    "idle"
  );
  const [files, setFiles] = useState<File[]>([]);
  const [localImages, setLocalImages] = useState<PromotionImage[]>(images);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadCount, setUploadCount] = useState(0);
  const [uploadedCount, setUploadedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setLocalImages(images);
  }, [images]);

  const progress = useMemo(() => {
    if (uploadCount === 0) return 0;
    return Math.round((uploadedCount / uploadCount) * 100);
  }, [uploadCount, uploadedCount]);

  const syncFileInput = (nextFiles: File[]) => {
    const input = fileInputRef.current;
    if (!input) return;
    const dataTransfer = new DataTransfer();
    nextFiles.forEach((file) => dataTransfer.items.add(file));
    input.files = dataTransfer.files;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const selectedFiles = files.filter((file) => file.size > 0);

    if (!promotionId || selectedFiles.length === 0) {
      setErrorMessage("Selecciona al menos un archivo.");
      setStatus("error");
      return;
    }

    const bucket =
      process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET_PROMOTIONS || "promotions";

    setUploadCount(selectedFiles.length);
    setUploadedCount(0);
    setStatus("uploading");
    setErrorMessage(null);

    try {
      const prepResponse = await fetch("/api/admin/promociones/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promotionId,
          files: selectedFiles.map((file) => ({ name: file.name, type: file.type })),
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

      const newImages: PromotionImage[] = [];
      for (const [index, file] of selectedFiles.entries()) {
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

        const recordPayload = await recordResponse.json();
        if (recordPayload.image) {
          newImages.push(recordPayload.image as PromotionImage);
        }

        setUploadedCount((count) => count + 1);
      }

      setLocalImages((prev) => [...prev, ...newImages]);
      setStatus("done");
      setFiles([]);
      syncFileInput([]);
    } catch (error) {
      setErrorMessage((error as Error).message || "No se pudo subir. Intenta de nuevo.");
      setStatus("error");
    }
  };

  const handleDelete = async (imageId: string) => {
    const response = await fetch(`/api/admin/promociones/images/${imageId}`, {
      method: "DELETE",
    });
    if (response.ok) {
      setLocalImages((prev) => prev.filter((image) => image.id !== imageId));
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
          Galería
        </p>
        <p className="text-xs text-slate-500">
          Sube varias imágenes para el carrusel de la promoción.
        </p>
      </div>

      {localImages.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-4 text-xs text-slate-500">
          Aún no hay imágenes cargadas.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {localImages.map((image) => (
            <div
              key={image.id}
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white"
            >
              <img
                src={image.fileUrl}
                alt="Imagen de la promoción"
                className="h-32 w-full object-cover"
              />
              <button
                type="button"
                onClick={() => handleDelete(image.id)}
                className="absolute right-2 top-2 rounded-full border border-white/60 bg-white/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600 opacity-0 transition-opacity group-hover:opacity-100"
              >
                X
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
          onChange={(event) => {
            const nextFiles = Array.from(event.target.files ?? []);
            setFiles(nextFiles);
          }}
        />
        {files.length > 0 ? (
          <div className="space-y-2 rounded-2xl border border-slate-200 bg-white/70 p-3 text-xs text-slate-600">
            {files.map((file, index) => (
              <div key={`${file.name}-${index}`} className="flex items-center justify-between">
                <span className="truncate">
                  {file.name} · {(file.size / (1024 * 1024)).toFixed(1)} MB
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const next = files.filter((_, fileIndex) => fileIndex !== index);
                    setFiles(next);
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
            {status === "uploading" &&
              `Subiendo ${uploadedCount}/${uploadCount} archivos...`}
            {status === "done" && "Imágenes subidas. Actualiza la lista."}
            {status === "error" && (errorMessage || "No se pudo subir.")}
          </span>
          {status === "uploading" ? (
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
          <Button type="submit" disabled={status === "uploading"}>
            Subir imágenes
          </Button>
        </div>
      </form>
    </div>
  );
}
