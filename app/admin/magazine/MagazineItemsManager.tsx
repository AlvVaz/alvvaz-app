"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";

type MagazineItem = {
  id: string;
  title: string;
  kind: string;
  fileUrl: string;
  sortOrder: number;
  metadata: Record<string, unknown>;
};

type MagazineItemsManagerProps = {
  issueId: string;
  items: MagazineItem[];
};

export function MagazineItemsManager({ issueId, items }: MagazineItemsManagerProps) {
  const [localItems, setLocalItems] = useState<MagazineItem[]>(() =>
    items.slice().sort((a, b) => a.sortOrder - b.sortOrder)
  );
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(
    null
  );
  const { confirm, dialog } = useConfirmDialog();
  const toastTimer = useRef<number | null>(null);

  useEffect(() => {
    setLocalItems(items.slice().sort((a, b) => a.sortOrder - b.sortOrder));
  }, [items]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) {
        window.clearTimeout(toastTimer.current);
      }
    };
  }, []);

  const showToast = (message: string, tone: "success" | "error" = "success") => {
    setToast({ message, tone });
    if (toastTimer.current) {
      window.clearTimeout(toastTimer.current);
    }
    toastTimer.current = window.setTimeout(() => setToast(null), 3200);
  };

  const formattedItems = useMemo(
    () =>
      localItems.map((item, index) => ({
        ...item,
        displayOrder: index + 1,
      })),
    [localItems]
  );

  const handleDrop = async (targetId: string) => {
    if (!draggingId || draggingId === targetId) return;
    const fromIndex = localItems.findIndex((item) => item.id === draggingId);
    const toIndex = localItems.findIndex((item) => item.id === targetId);
    if (fromIndex < 0 || toIndex < 0) return;

    const next = localItems.slice();
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setLocalItems(next);

    const updates = next.map((item, index) => ({
      id: item.id,
      sortOrder: index,
    }));

    const response = await fetch("/api/admin/magazine/items/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updates, issueId }),
    });

    if (response.ok) {
      showToast("Orden guardado");
    } else {
      showToast("No se pudo guardar el orden", "error");
    }
  };

  const handleDelete = async (itemId: string, label: string) => {
    confirm(`Seguro que quieres eliminar ${label}?`, async () => {
      const response = await fetch(`/api/admin/magazine/items/${itemId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        showToast("No se pudo eliminar el archivo", "error");
        return;
      }
      setLocalItems((prev) => prev.filter((item) => item.id !== itemId));
      showToast("Archivo eliminado");
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
          Archivos cargados
        </p>
        <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
          Arrastra para ordenar
        </span>
      </div>
      {formattedItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-4 text-sm text-slate-500">
          Sin archivos adjuntos.
        </div>
      ) : (
        <ul className="space-y-2">
          {formattedItems.map((item) => (
            <li
              key={item.id}
              className={cn(
                "flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm",
                draggingId === item.id ? "opacity-70" : ""
              )}
              draggable
              onDragStart={() => setDraggingId(item.id)}
              onDragEnd={() => setDraggingId(null)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => handleDrop(item.id)}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="h-12 w-12 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                  {item.kind === "IMAGE" ? (
                    <img
                      src={item.fileUrl}
                      alt={item.title || "Imagen"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                      PDF
                    </div>
                  )}
                </div>
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-brand-200 text-[11px] font-semibold text-brand-700">
                  {item.displayOrder}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm text-slate-700">
                    {item.title || item.fileUrl}
                  </p>
                  <p className="text-xs uppercase tracking-[0.2em] text-brand-600">
                    {item.kind}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  handleDelete(item.id, item.title || item.fileUrl || "este archivo")
                }
                className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-700 hover:border-rose-300"
                aria-label="Eliminar archivo"
              >
                X
              </button>
            </li>
          ))}
        </ul>
      )}
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
      {dialog}
    </div>
  );
}
