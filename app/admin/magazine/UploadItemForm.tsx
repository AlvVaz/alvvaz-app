"use client";

import type { FormEvent } from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

type IssueOption = {
  id: string;
  title: string;
};

export function UploadItemForm({ issues }: { issues: IssueOption[] }) {
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">(
    "idle"
  );
  const [uploadCount, setUploadCount] = useState(0);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    const files = formData
      .getAll("file")
      .filter((item) => item instanceof File && item.size > 0);

    setUploadCount(files.length);
    setStatus("uploading");

    try {
      const response = await fetch("/api/admin/magazine/items", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      setStatus("done");
      form.reset();
    } catch {
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
        />
        <p className="text-xs text-slate-500">Puedes seleccionar varios archivos.</p>
      </div>
      <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
        <span>
          {status === "uploading" &&
            `Subiendo${uploadCount > 1 ? ` ${uploadCount} archivos` : "..."}`}
          {status === "done" &&
            `${uploadCount > 1 ? "Archivos subidos" : "Archivo subido"}. Actualiza la lista.`}
          {status === "error" && "No se pudo subir. Intenta de nuevo."}
        </span>
        <Button type="submit" disabled={status === "uploading"}>
          Subir archivo
        </Button>
      </div>
    </form>
  );
}
