"use client";

import type { FormEvent } from "react";
import { useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { supabaseClient } from "@/lib/supabase/client";

type IssueOption = {
  id: string;
  title: string;
};

export function UploadItemForm({ issues }: { issues: IssueOption[] }) {
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">(
    "idle"
  );
  const [uploadCount, setUploadCount] = useState(0);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const progress = useMemo(() => {
    if (uploadCount === 0) return 0;
    return Math.round((uploadedCount / uploadCount) * 100);
  }, [uploadedCount, uploadCount]);

  const syncFileInput = (nextFiles: File[]) => {
    const input = fileInputRef.current;
    if (!input) return;
    const dataTransfer = new DataTransfer();
    nextFiles.forEach((file) => dataTransfer.items.add(file));
    input.files = dataTransfer.files;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const issueId = String(formData.get("issueId") ?? "").trim();
    const title = String(formData.get("title") ?? "").trim();
    const selectedFiles = files.filter((file) => file.size > 0);

    if (!issueId || selectedFiles.length === 0) {
      setErrorMessage("Selecciona una edición y al menos un archivo.");
      setStatus("error");
      return;
    }

    const bucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "magazine";

    setUploadCount(selectedFiles.length);
    setUploadedCount(0);
    setStatus("uploading");
    setErrorMessage(null);

    try {
      const uploadedItems = [];
      for (const file of selectedFiles) {
        const mime = file.type;
        const kind =
          mime === "application/pdf"
            ? "PDF"
            : mime.startsWith("image/")
            ? "IMAGE"
            : null;
        if (!kind) {
          throw new Error("Formato no soportado.");
        }
        const storagePath = `issues/${issueId}/${file.name}`;
        const { error: uploadError } = await supabaseClient.storage
          .from(bucket)
          .upload(storagePath, file, { contentType: mime, upsert: false });

        if (uploadError) {
          throw new Error(uploadError.message || "No se pudo subir el archivo.");
        }

        const { data } = supabaseClient.storage.from(bucket).getPublicUrl(storagePath);
        const fileUrl = data.publicUrl;
        const resolvedTitle = title || file.name.replace(/\.[^/.]+$/, "") || "Archivo";

        uploadedItems.push({
          issueId,
          title: resolvedTitle,
          kind,
          fileUrl,
          metadata: {
            mime,
            originalName: file.name,
            bucket,
            storagePath,
          },
        });

        setUploadedCount((count) => count + 1);
      }

      const response = await fetch("/api/admin/magazine/items/metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(uploadedItems),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "No se pudo guardar en la base de datos.");
      }

      setStatus("done");
      form.reset();
      setFiles([]);
      syncFileInput([]);
    } catch (error) {
      setErrorMessage((error as Error).message || "No se pudo subir. Intenta de nuevo.");
      setStatus("error");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
          Issue destino
        </label>
        <select
          name="issueId"
          required
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
        >
          <option value="">Selecciona una edición</option>
          {issues.map((issue) => (
            <option key={issue.id} value={issue.id}>
              {issue.title}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
          Título interno
        </label>
        <input
          name="title"
          placeholder="Catálogo principal o portada"
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
        />
      </div>
      <div className="md:col-span-2 space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
          Archivos (PDF o imagen)
        </label>
        <input
          type="file"
          name="file"
          required
          multiple
          accept="application/pdf,image/*"
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
          ref={fileInputRef}
          onChange={(event) => {
            const nextFiles = Array.from(event.target.files ?? []);
            setFiles(nextFiles);
          }}
        />
        <p className="text-xs text-slate-500">Puedes seleccionar varios archivos.</p>
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
      </div>
      <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
        <span>
          {status === "uploading" &&
            `Subiendo ${uploadedCount}/${uploadCount} archivos...`}
          {status === "done" &&
            `${uploadCount > 1 ? "Archivos subidos" : "Archivo subido"}. Actualiza la lista.`}
          {status === "error" && (errorMessage || "No se pudo subir. Intenta de nuevo.")}
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
          Subir archivo
        </Button>
      </div>
    </form>
  );
}
