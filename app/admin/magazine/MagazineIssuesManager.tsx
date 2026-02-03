"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import IssueShareButton from "./IssueShareButton";
import { MagazineItemsManager } from "./MagazineItemsManager";

type MagazineIssue = {
  id: string;
  slug: string;
  title: string;
  description: string;
  publishedAt: string | null;
  thumbnailUrl: string | null;
  sortOrder: number;
};

type MagazineItem = {
  id: string;
  issueId: string;
  title: string;
  kind: string;
  fileUrl: string;
  sortOrder: number;
  metadata: Record<string, unknown>;
};

type MagazineIssuesManagerProps = {
  issues: MagazineIssue[];
  items: MagazineItem[];
  updateIssueAction: (formData: FormData) => void;
  deleteIssueAction: (formData: FormData) => void;
};

const FALLBACK_THUMB = "/magazine/placeholders/01.svg";

export function MagazineIssuesManager({
  issues,
  items,
  updateIssueAction,
  deleteIssueAction,
}: MagazineIssuesManagerProps) {
  const [localIssues, setLocalIssues] = useState<MagazineIssue[]>(() =>
    issues.slice().sort((a, b) => a.sortOrder - b.sortOrder)
  );
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(
    null
  );
  const toastTimer = useRef<number | null>(null);

  useEffect(() => {
    setLocalIssues(issues.slice().sort((a, b) => a.sortOrder - b.sortOrder));
  }, [issues]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) {
        window.clearTimeout(toastTimer.current);
      }
    };
  }, []);

  const itemsByIssue = useMemo(() => {
    const map = new Map<string, MagazineItem[]>();
    for (const item of items) {
      const current = map.get(item.issueId) ?? [];
      map.set(item.issueId, [...current, item]);
    }
    return map;
  }, [items]);

  const showToast = (message: string, tone: "success" | "error" = "success") => {
    setToast({ message, tone });
    if (toastTimer.current) {
      window.clearTimeout(toastTimer.current);
    }
    toastTimer.current = window.setTimeout(() => setToast(null), 3200);
  };

  const handleDrop = async (targetId: string) => {
    if (!draggingId || draggingId === targetId) return;
    const fromIndex = localIssues.findIndex((issue) => issue.id === draggingId);
    const toIndex = localIssues.findIndex((issue) => issue.id === targetId);
    if (fromIndex < 0 || toIndex < 0) return;

    const next = localIssues.slice();
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    const reordered = next.map((issue, index) => ({
      ...issue,
      sortOrder: index,
    }));
    setLocalIssues(reordered);

    const updates = reordered.map((issue, index) => ({
      id: issue.id,
      sortOrder: index,
    }));

    const response = await fetch("/api/admin/magazine/issues/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updates }),
    });

    if (response.ok) {
      showToast("Orden guardado");
    } else {
      showToast("No se pudo guardar el orden", "error");
    }
  };

  if (localIssues.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-brand-200 bg-white/60 p-6 text-sm text-slate-600">
        Aún no hay ediciones cargadas.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
          Arrastra para ordenar
        </p>
        <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
          Orden público
        </span>
      </div>

      <div className="grid gap-4">
        {localIssues.map((issue) => {
          const issueItems = itemsByIssue.get(issue.id) ?? [];
          const publishedLabel = issue.publishedAt
            ? new Date(issue.publishedAt).toLocaleDateString("es-MX")
            : "Sin fecha";
          const cover =
            issue.thumbnailUrl ??
            issueItems.find((item) => item.kind === "IMAGE")?.fileUrl ??
            FALLBACK_THUMB;

          return (
            <details
              key={issue.id}
              className={cn(
                "rounded-3xl border border-slate-200 bg-white shadow-sm",
                draggingId === issue.id ? "opacity-70" : ""
              )}
              draggable
              onDragStart={() => setDraggingId(issue.id)}
              onDragEnd={() => setDraggingId(null)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => handleDrop(issue.id)}
            >
              <summary className="cursor-pointer list-none px-6 py-4 [&::-webkit-details-marker]:hidden">
                <div className="grid items-center gap-4 md:grid-cols-[2fr_1.5fr_0.8fr_0.7fr_0.6fr]">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="h-14 w-14 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                      <img
                        src={cover}
                        alt={`Miniatura de ${issue.title}`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                        Edición
                      </p>
                      <p className="truncate font-display text-lg text-brand-950">
                        {issue.title}
                      </p>
                      <p className="truncate text-xs text-slate-500">/magazine/{issue.slug}</p>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                      Resumen
                    </p>
                    <p className="line-clamp-2 text-sm text-slate-600">
                      {issue.description || "Sin descripción."}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                      Publicación
                    </p>
                    <p className="text-sm text-slate-700">{publishedLabel}</p>
                  </div>
                  <div className="text-right md:text-left">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                      Archivos
                    </p>
                    <p className="text-sm text-slate-700">{issueItems.length}</p>
                  </div>
                  <div className="flex items-end justify-end md:justify-start">
                    <IssueShareButton
                      slug={issue.slug}
                      title={issue.title}
                      deleteAction={deleteIssueAction}
                      issueId={issue.id}
                    />
                  </div>
                </div>
              </summary>

              <div className="border-t border-slate-200 px-6 py-4">
                <form action={updateIssueAction} className="grid gap-4 text-sm md:grid-cols-2">
                  <input type="hidden" name="id" value={issue.id} />
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                      Título
                    </label>
                    <input
                      name="title"
                      defaultValue={issue.title}
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
                      defaultValue={issue.publishedAt ? issue.publishedAt.slice(0, 10) : ""}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                      Descripción
                    </label>
                    <textarea
                      name="description"
                      defaultValue={issue.description}
                      className="min-h-[80px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                    />
                  </div>
                  <div className="md:col-span-2 flex flex-wrap items-center justify-end gap-3">
                    <Button type="submit" variant="secondary">
                      Guardar cambios
                    </Button>
                  </div>
                </form>

                <div className="mt-6">
                  <MagazineItemsManager issueId={issue.id} items={issueItems} />
                </div>
              </div>
            </details>
          );
        })}
      </div>

      {toast ? (
        <div className="fixed bottom-6 right-6 z-50">
          <div
            className={cn(
              "rounded-2xl border px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] shadow-lg",
              toast.tone === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-rose-200 bg-rose-50 text-rose-700"
            )}
          >
            {toast.message}
          </div>
        </div>
      ) : null}
    </div>
  );
}
