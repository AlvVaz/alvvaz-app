"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useContractsToast } from "./ContractsToastProvider";

type ContractStatusButtonsProps = {
  contractId: string;
  isLocked?: boolean;
};

export default function ContractStatusButtons({
  contractId,
  isLocked = false,
}: ContractStatusButtonsProps) {
  const router = useRouter();
  const { push: pushToast } = useContractsToast();
  const [isUpdating, setIsUpdating] = useState(false);

  const statuses = [
    {
      label: "Pendiente",
      value: "pending",
      className: "bg-amber-400 shadow-[0_0_0_3px_rgba(251,191,36,0.2)]",
    },
    {
      label: "Aprobado",
      value: "paid",
      className: "bg-emerald-400 shadow-[0_0_0_3px_rgba(52,211,153,0.2)]",
    },
    {
      label: "Cancelado",
      value: "canceled",
      className: "bg-rose-400 shadow-[0_0_0_3px_rgba(251,113,133,0.2)]",
    },
  ];

  const handleUpdateStatus = async (value: string, label: string) => {
    if (isUpdating || isLocked) return;
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/admin/contracts/${contractId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: value }),
      });
      if (!response.ok) {
        throw new Error("No se pudo actualizar el estado.");
      }
      pushToast(`Estado actualizado a ${label}.`, "info");
      router.refresh();
    } catch {
      pushToast("No se pudo actualizar el estado.", "error");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {statuses.map((status) => (
        <button
          key={status.value}
          type="button"
          disabled={isUpdating || isLocked}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            handleUpdateStatus(status.value, status.label);
          }}
          title={status.label}
          aria-label={`Marcar como ${status.label}`}
          className={`h-4 w-4 rounded-full transition hover:scale-110 disabled:opacity-50 ${status.className}`}
        >
          <span className="sr-only">{status.label}</span>
        </button>
      ))}
    </div>
  );
}
