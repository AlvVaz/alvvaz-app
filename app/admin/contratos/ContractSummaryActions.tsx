"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

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
  const [isDownloading, setIsDownloading] = useState(false);
  const { push: pushToast } = useContractsToast();

  const buildFileName = () => {
    const baseTitle =
      (contractTitle || "CONTRATO")
        .toUpperCase()
        .replace(/[\\/:*?"<>|]/g, " ")
        .replace(/\s+/g, " ")
        .trim() || "CONTRATO";
    const normalizedNumber = String(contractNumber ?? "")
      .toUpperCase()
      .replace(/[\\/:*?"<>|]/g, " ")
      .replace(/\s+/g, " ")
      .replace(/^#+/, "")
      .trim();
    return normalizedNumber ? `${baseTitle}-#${normalizedNumber}` : baseTitle;
  };

  const handleViewPdf = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    window.open(`/contratos/${contractId}/pdf`, "_blank", "noopener,noreferrer");
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
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={handleViewPdf}
        aria-label="Ver PDF"
        title="Ver PDF"
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-brand-200 bg-white text-brand-600 shadow-sm transition hover:border-brand-300 hover:text-brand-800"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M12 5c-5.5 0-9.5 4.5-10.5 6.2a1.5 1.5 0 0 0 0 1.6C2.5 14.5 6.5 19 12 19s9.5-4.5 10.5-6.2a1.5 1.5 0 0 0 0-1.6C21.5 9.5 17.5 5 12 5zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm0-6a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
        </svg>
      </button>
      <button
        type="button"
        onClick={handleDownloadPdf}
        aria-label="Guardar PDF"
        title={isDownloading ? "Guardando..." : "Guardar PDF"}
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-full border border-brand-200 bg-white text-brand-600 shadow-sm transition hover:border-brand-300 hover:text-brand-800",
          isDownloading ? "animate-pulse" : ""
        )}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M17 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7l-2-4zM7 5h8v4H7V5zm5 14H7v-6h5v6zm2 0v-6h2v6h-2z" />
        </svg>
      </button>
    </div>
  );
}
