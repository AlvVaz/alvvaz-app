"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useContractsToast } from "./ContractsToastProvider";

type ImportSummary = {
  total: number;
  created: number;
  skipped: number;
  errors: string[];
};

export default function ImportContractsForm() {
  const [file, setFile] = useState<File | null>(null);
  const [year, setYear] = useState("2025");
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const { push: pushToast } = useContractsToast();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isUploading) return;
    setProgress(12);
    const timer = window.setInterval(() => {
      setProgress((current) => {
        if (current >= 88) return current;
        return current + Math.max(2, Math.round((90 - current) * 0.2));
      });
    }, 400);
    return () => window.clearInterval(timer);
  }, [isUploading]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      pushToast("Selecciona un archivo antes de importar.", "error");
      return;
    }
    setIsUploading(true);
    setProgress(0);
    setSummary(null);
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("year", year);
      const response = await fetch("/api/admin/contracts/import", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as ImportSummary & {
        ok?: boolean;
        error?: string;
      };
      if (!response.ok || payload?.ok === false) {
        pushToast(payload?.error || "No se pudo importar el archivo.", "error");
        return;
      }
      setSummary(payload);
      pushToast(`Importados ${payload.created} contratos.`, "info");
      setProgress(100);
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      router.refresh();
    } catch {
      pushToast("No se pudo importar el archivo.", "error");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-[1fr_auto]">
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            Archivo Excel (2025)
          </label>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            ref={fileInputRef}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            Año
          </label>
          <input
            value={year}
            onChange={(event) => setYear(event.target.value)}
            className="w-32 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          Importa columnas: Nombre del cliente, fecha de salida, fecha de regreso,
          destino, hotel, teléfono, pasajeros, vendedor, proveedor y contrato.
        </p>
        <Button type="submit" disabled={isUploading}>
          {isUploading ? "Importando..." : "Importar contratos"}
        </Button>
      </div>

      {isUploading || progress > 0 ? (
        <div className="space-y-2">
          <div className="h-2 w-full rounded-full bg-slate-200">
            <div
              className="h-2 rounded-full bg-brand-600 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-slate-500">
            {progress >= 100 ? "Importación completada." : "Procesando archivo..."}
          </p>
        </div>
      ) : null}

      {summary ? (
        <div className="rounded-2xl border border-brand-200 bg-white/70 p-4 text-sm text-slate-600">
          <p>
            Filas: {summary.total} · Importados: {summary.created} · Omitidos:{" "}
            {summary.skipped}
          </p>
          {summary.errors?.length ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-rose-600">
              {summary.errors.slice(0, 5).map((error, index) => (
                <li key={`${error}-${index}`}>{error}</li>
              ))}
              {summary.errors.length > 5 ? (
                <li>+{summary.errors.length - 5} más...</li>
              ) : null}
            </ul>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
