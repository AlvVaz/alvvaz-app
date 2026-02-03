"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

type NewIssueFormProps = {
  action: (
    prevState: { submittedAt: number },
    formData: FormData
  ) => Promise<{ submittedAt: number }>;
};

export function NewIssueForm({ action }: NewIssueFormProps) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [formState, formAction] = useActionState(action, { submittedAt: 0 });
  const [toastVisible, setToastVisible] = useState(false);

  useEffect(() => {
    if (!formState.submittedAt) return;
    setToastVisible(true);
    formRef.current?.reset();
    const timer = setTimeout(() => setToastVisible(false), 3500);
    return () => clearTimeout(timer);
  }, [formState.submittedAt]);

  return (
    <>
      <form ref={formRef} action={formAction} className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            Título
          </label>
          <input
            name="title"
            required
            placeholder="Edición Primavera 2026"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            Fecha de publicación
          </label>
          <input
            type="date"
            name="publishedAt"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
          />
        </div>
        <div className="md:col-span-2 space-y-2">
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            Miniatura (URL)
          </label>
          <input
            name="thumbnailUrl"
            type="url"
            placeholder="https://..."
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
          />
        </div>
        <div className="md:col-span-2 space-y-2">
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            Descripción
          </label>
          <textarea
            name="description"
            className="min-h-[90px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            placeholder="Resumen breve de destinos, experiencias y promociones."
          />
        </div>
        <div className="md:col-span-2 flex justify-end">
          <Button type="submit">Crear edición</Button>
        </div>
      </form>

      {toastVisible ? (
        <div className="pointer-events-none fixed bottom-6 right-6 z-50">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 shadow-lg">
            Edición creada.
          </div>
        </div>
      ) : null}
    </>
  );
}
