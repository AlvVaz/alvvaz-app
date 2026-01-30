"use client";

import { useActionState, useEffect } from "react";

import { Button } from "@/components/ui/button";

import { useContractsToast } from "./ContractsToastProvider";
import { syncClientsFromContractsAction } from "./actions";

const initialState = { updatedAt: 0, ok: false, error: "" };

export function SyncClientsButton() {
  const [state, action] = useActionState(syncClientsFromContractsAction, initialState);
  const { push: pushToast } = useContractsToast();

  useEffect(() => {
    if (!state.updatedAt) return;
    if (state.ok) {
      pushToast("Contactos actualizados.", "info");
    } else {
      pushToast(state.error || "No se pudo actualizar.", "error");
    }
  }, [state.updatedAt, state.ok, state.error, pushToast]);

  return (
    <form action={action}>
      <Button type="submit" variant="secondary">
        Actualizar en clientes
      </Button>
    </form>
  );
}
