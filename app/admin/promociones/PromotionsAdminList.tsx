"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import type { Promotion } from "@/lib/db";
import { cn, formatPriceMXN } from "@/lib/utils";

import { PromotionFields } from "./PromotionFields";
import { PromotionImagesManager } from "./PromotionImagesManager";

type PromotionsAdminListProps = {
  promotions: Promotion[];
  presetTags: string[];
  updateAction: (formData: FormData) => Promise<void>;
  deleteAction: (formData: FormData) => Promise<void>;
};

type PromotionStatus = "live" | "paused" | "draft";

const statusConfig: Record<
  PromotionStatus,
  {
    label: string;
    badgeClass: string;
    sectionTitle: string;
    cardClass: string;
  }
> = {
  live: {
    label: "Live",
    badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
    sectionTitle: "Promociones en vivo",
    cardClass:
      "border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-emerald-100/70 shadow-emerald-200/40",
  },
  paused: {
    label: "Pausado",
    badgeClass: "border-amber-200 bg-amber-50 text-amber-700",
    sectionTitle: "Promociones pausadas",
    cardClass:
      "border-amber-200/80 bg-gradient-to-br from-amber-50 via-white to-amber-100/70 shadow-amber-200/40",
  },
  draft: {
    label: "Borrador",
    badgeClass: "border-sky-200 bg-sky-50 text-sky-700",
    sectionTitle: "Promociones en borrador",
    cardClass:
      "border-sky-200/80 bg-gradient-to-br from-sky-50 via-white to-sky-100/70 shadow-sky-200/40",
  },
};

const statusOrder: PromotionStatus[] = ["live", "paused", "draft"];

function groupPromotions(promotions: Promotion[]) {
  const grouped: Record<PromotionStatus, Promotion[]> = {
    live: [],
    paused: [],
    draft: [],
  };

  promotions.forEach((promotion) => {
    const status = promotion.status as PromotionStatus;
    grouped[status].push(promotion);
  });

  statusOrder.forEach((status) => {
    grouped[status] = grouped[status].slice().sort((a, b) => a.sortOrder - b.sortOrder);
  });

  return grouped;
}

export function PromotionsAdminList({
  promotions,
  presetTags,
  updateAction,
  deleteAction,
}: PromotionsAdminListProps) {
  const [toast, setToast] = useState<{
    message: string;
    tone: "success" | "error" | "info";
  } | null>(null);
  const [itemsByStatus, setItemsByStatus] = useState(() =>
    groupPromotions(promotions)
  );
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [draggingStatus, setDraggingStatus] = useState<PromotionStatus | null>(null);

  useEffect(() => {
    setItemsByStatus(groupPromotions(promotions));
  }, [promotions]);

  const handleDrop = async (status: PromotionStatus, targetId: string) => {
    if (!draggingId || draggingStatus !== status) return;
    const current = itemsByStatus[status];
    const fromIndex = current.findIndex((item) => item.id === draggingId);
    const toIndex = current.findIndex((item) => item.id === targetId);
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;

    const next = current.slice();
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);

    setItemsByStatus((prev) => ({ ...prev, [status]: next }));

    const updates = next.map((item, index) => ({ id: item.id, sortOrder: index }));
    await fetch("/api/admin/promociones/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updates }),
    });
  };

  const sections = useMemo(() => {
    return statusOrder.map((status) => ({
      status,
      title: statusConfig[status].sectionTitle,
      items: itemsByStatus[status],
    }));
  }, [itemsByStatus]);

  const showToast = (message: string, tone: "success" | "error" | "info" = "success") => {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 3200);
  };

  return (
    <div className="space-y-10">
      {sections.map((section) => (
        <section key={section.status} className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg text-brand-950">{section.title}</h3>
            <span className="rounded-full border border-brand-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
              {section.items.length} {section.items.length === 1 ? "Promo" : "Promos"}
            </span>
          </div>

          {section.items.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white/70 p-6 text-sm text-slate-500">
              Aún no hay promociones en esta sección.
            </div>
          ) : (
            <div className="grid gap-4">
              {section.items.map((promotion) => {
                const statusMeta = statusConfig[promotion.status as PromotionStatus];
                const heroImage = promotion.images[0]?.fileUrl;

                return (
                  <details
                    key={promotion.id}
                    className={cn(
                      "rounded-3xl border bg-white shadow-sm transition-shadow",
                      statusConfig[section.status].cardClass
                    )}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => handleDrop(section.status, promotion.id)}
                  >
                    <summary
                      className="cursor-pointer list-none px-6 py-4 [&::-webkit-details-marker]:hidden"
                      draggable
                      onDragStart={() => {
                        setDraggingId(promotion.id);
                        setDraggingStatus(section.status);
                      }}
                      onDragEnd={() => {
                        setDraggingId(null);
                        setDraggingStatus(null);
                      }}
                    >
                      <div className="grid items-center gap-4 md:grid-cols-[0.7fr_1.3fr_0.7fr_0.7fr_0.6fr]">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "h-14 w-14 overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-brand-100 via-white to-brand-200"
                            )}
                          >
                            {heroImage ? (
                              <img
                                src={heroImage}
                                alt={promotion.title}
                                className="h-full w-full object-cover"
                              />
                            ) : null}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                              Promoción
                            </p>
                            <p className="truncate font-display text-base text-brand-950">
                              {promotion.title}
                            </p>
                            <p className="text-xs text-slate-500">
                              /promociones/{promotion.slug}
                            </p>
                          </div>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                            Destino
                          </p>
                          <p className="truncate text-sm text-slate-700">
                            {promotion.destinationCity}, {promotion.destinationState}
                          </p>
                          <p className="text-xs text-slate-500">
                            {promotion.durationDays} días
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                            Precio desde
                          </p>
                          <p className="text-sm font-semibold text-brand-900">
                            {formatPriceMXN(promotion.priceFrom)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                            Estado
                          </p>
                          <span
                            className={cn(
                              "inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]",
                              statusMeta.badgeClass
                            )}
                          >
                            {statusMeta.label}
                          </span>
                        </div>
                        <div className="text-right md:text-left">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                            Imágenes
                          </p>
                          <p className="text-sm text-slate-600">{promotion.images.length}</p>
                        </div>
                      </div>
                    </summary>

                    <div className="border-t border-slate-200 px-6 py-6">
                      <form
                        action={updateAction}
                        className="space-y-6"
                      >
                        <input type="hidden" name="id" value={promotion.id} />
                        <PromotionFields
                          defaults={promotion}
                          presetTags={presetTags}
                          afterDescription={
                            <PromotionImagesManager
                              promotionId={promotion.id}
                              images={promotion.images.map((image) => ({
                                id: image.id,
                                fileUrl: image.fileUrl,
                                storagePath: image.storagePath,
                              }))}
                            />
                          }
                        />
                        <div className="flex flex-wrap items-center justify-end gap-3">
                          <Button
                            type="button"
                            variant="subtle"
                            className="border border-sky-200 bg-sky-50 text-sky-700 shadow-sm hover:border-sky-300 hover:text-sky-800"
                            onClick={(event) => {
                              const details = event.currentTarget.closest("details");
                              if (details) details.removeAttribute("open");
                            }}
                          >
                            Cerrar
                          </Button>
                          <Button
                            type="submit"
                            variant="secondary"
                            onClick={() => showToast("Cambios guardados.")}
                          >
                            Guardar cambios
                          </Button>
                          <Button
                            type="submit"
                            formAction={deleteAction}
                            variant="subtle"
                            className="border border-rose-300 bg-rose-50 text-rose-700 shadow-sm hover:border-rose-400 hover:text-rose-800"
                            onClick={() => showToast("Promoción eliminada.", "info")}
                          >
                            Eliminar
                          </Button>
                        </div>
                      </form>
                    </div>
                  </details>
                );
              })}
            </div>
          )}
        </section>
      ))}
      {toast ? (
        <div
          className={cn(
            "fixed bottom-6 right-6 z-50 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] shadow-sm",
            toast.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : toast.tone === "error"
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : "border-sky-200 bg-sky-50 text-sky-700"
          )}
        >
          {toast.message}
        </div>
      ) : null}
    </div>
  );
}
