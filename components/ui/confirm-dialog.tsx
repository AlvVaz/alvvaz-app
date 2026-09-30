"use client";

import { useCallback, useState } from "react";

type ConfirmOptions = {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  note?: string;
  tone?: ConfirmTone;
};

type ConfirmTone = "danger" | "success";

type ConfirmState = {
  open: boolean;
  message: string;
  note?: string;
  onConfirm?: () => void;
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
};

export function useConfirmDialog() {
  const [state, setState] = useState<ConfirmState>({
    open: false,
    message: "",
  });

  const confirm = useCallback(
    (message: string, onConfirm: () => void, options?: ConfirmOptions) => {
      setState({
        open: true,
        message,
        onConfirm,
        note: options?.note,
        title: options?.title,
        confirmLabel: options?.confirmLabel,
        cancelLabel: options?.cancelLabel,
        tone: options?.tone,
      });
    },
    []
  );

  const close = useCallback(() => {
    setState((current) => ({ ...current, open: false }));
  }, []);

  const handleConfirm = useCallback(() => {
    const action = state.onConfirm;
    setState((current) => ({ ...current, open: false }));
    if (action) action();
  }, [state.onConfirm]);

  const dialog = state.open ? (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">
          {state.title ?? "Confirmar eliminación"}
        </p>
        <p className="mt-3 text-sm text-slate-700">{state.message}</p>
        {state.note ? (
          <p className="mt-1 text-sm italic text-slate-500">{state.note}</p>
        ) : null}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={close}
            className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
          >
            {state.cancelLabel ?? "No"}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
              state.tone === "success"
                ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:border-emerald-400 hover:text-emerald-800"
                : "border-rose-300 bg-rose-50 text-rose-700 hover:border-rose-400 hover:text-rose-800"
            }`}
          >
            {state.confirmLabel ?? "Si"}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { confirm, dialog };
}
