"use client";

import { useActionState, useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";

import { createPromotionActionWithState } from "./actions";
import { PromotionFields } from "./PromotionFields";
import { PromotionImagesManager } from "./PromotionImagesManager";

type NewPromotionFormProps = {
  presetTags: string[];
};

const initialState = {
  createdAt: 0,
  promotionId: "",
  error: "",
};

export function NewPromotionForm({ presetTags }: NewPromotionFormProps) {
  const [formState, formAction] = useActionState(
    createPromotionActionWithState,
    initialState
  );
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    if (!formState.createdAt) return;
    formRef.current?.reset();
  }, [formState.createdAt]);

  const hasPromotion = Boolean(formState.promotionId);

  return (
    <form ref={formRef} action={formAction} className="space-y-6">
      <PromotionFields
        presetTags={presetTags}
        afterDescription={
          hasPromotion ? (
            <PromotionImagesManager promotionId={formState.promotionId} images={[]} />
          ) : (
            <div className="rounded-2xl border border-dashed border-brand-200 bg-white/70 p-4 text-sm text-slate-600">
              Guarda la promoción para habilitar la carga de imágenes.
            </div>
          )
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
