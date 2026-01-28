"use client";

import { useState } from "react";
import { useContractsToast } from "./ContractsToastProvider";

type ContractSummaryActionsProps = {
  contractId: string;
  contractTitle: string;
  contractNumber?: string | null;
};

export default function ContractSummaryActions({
  contractId,
  contractTitle,
  contractNumber,
}: ContractSummaryActionsProps) {
  const [isSending, setIsSending] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const { push: pushToast } = useContractsToast();

  const buildFileName = () => {
    const baseTitle = contractTitle || "Contrato";
    const suffix = contractNumber ? `- ${contractNumber}` : "";
    const raw = `${baseTitle} ${suffix}`.trim();
    return raw.replace(/[^\w\s-]/g, "").replace(/\s+/g, " ").trim() || "Contrato";
  };

  const handleViewPdf = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    window.open(`/contratos/${contractId}/pdf`, "_blank", "noopener,noreferrer");
  };

  const handleSendPdf = async (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
    event.stopPropagation();
    if (isSending) return;
    setIsSending(true);
    try {
      const response = await fetch(`/api/admin/contracts/${contractId}/pdf`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("No se pudo generar el PDF.");
      }
      await response.json();
      const origin = window.location.origin;
      const shareUrl = `${origin}/contratos/${contractId}/pdf`;
      const message = `Hola, aquí está tu contrato: ${shareUrl}`;
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, "_blank", "noopener,noreferrer");
      pushToast("PDF enviado.");
    } catch {
      pushToast("No se pudo enviar el PDF.", "error");
    } finally {
      setIsSending(false);
    }
  };

  const handleDownloadPdf = async (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
    event.stopPropagation();
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const response = await fetch(`/api/admin/contracts/${contractId}/pdf`);
      if (!response.ok) {
        throw new Error("No se pudo obtener el PDF.");
      }
      const payload = await response.json();
      const signedUrl = payload?.signedUrl as string | undefined;
      if (!signedUrl) {
        throw new Error("No se pudo obtener el PDF.");
      }
      const fileResponse = await fetch(signedUrl);
      if (!fileResponse.ok) {
        throw new Error("No se pudo descargar el PDF.");
      }
      const blob = await fileResponse.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${buildFileName()}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      pushToast("PDF guardado.");
    } catch {
      // Silent failure to keep the summary clean.
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2 text-right md:items-start md:text-left">
      <button
        type="button"
        onClick={handleViewPdf}
        className="inline-flex rounded-full border border-brand-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-700 shadow-sm transition hover:border-brand-300 hover:text-brand-900"
      >
        Ver PDF
      </button>
      <button
        type="button"
        onClick={handleDownloadPdf}
        className="inline-flex rounded-full border border-brand-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-700 shadow-sm transition hover:border-brand-300 hover:text-brand-900"
      >
        {isDownloading ? "Guardando..." : "Guardar PDF"}
      </button>
      <button
        type="button"
        onClick={handleSendPdf}
        className="inline-flex rounded-full border border-brand-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-700 shadow-sm transition hover:border-brand-300 hover:text-brand-900"
      >
        {isSending ? "Enviando..." : "Enviar PDF"}
      </button>
    </div>
  );
}
