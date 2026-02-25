"use client";

import type { FormEvent, MouseEvent, WheelEvent } from "react";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type { Contract, TripTraveler } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { ThemedSelect } from "@/components/ui/themed-select";
import { useContractsToast } from "./ContractsToastProvider";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";

type ContractFormProps = {
  action: (
    prevState: { submittedAt: number; error?: string; field?: "contractNumber" | "general" },
    formData: FormData
  ) => Promise<{ submittedAt: number; error?: string; field?: "contractNumber" | "general" }>;
  deleteAction?: (formData: FormData) => void;
  initialContract?: Contract;
  draftContract?: Contract | null;
  submitLabel: string;
  resetOnSubmit?: boolean;
  organizerOptions?: { value: string; label: string }[];
  suggestedContractNumber?: string;
  canEditContractNumber?: boolean;
  isEditLocked?: boolean;
};

const emptyTraveler: TripTraveler = { name: "", phone: "", contract: "" };
const emptyContractItem = { qty: "1", details: "" };

const parseContractItems = (description?: string | null) => {
  if (!description) return [{ ...emptyContractItem }];
  const lines = description
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return [{ ...emptyContractItem }];

  return lines.map((line) => {
    const match = line.match(/^(\d+)\s*[xX]\s*(.+)$/);
    if (match) {
      return { qty: match[1], details: match[2].trim() };
    }
    return { qty: "1", details: line };
  });
};

const parseMoney = (value: string) => {
  const cleaned = value.replace(/[^\d.-]/g, "");
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
};

const preventNumberInputWheel = (event: WheelEvent<HTMLInputElement>) => {
  event.currentTarget.blur();
};

const formatMoney = (value: string) => {
  const parsed = parseMoney(value);
  if (parsed === null) return "";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(parsed);
};

export function ContractForm({
  action,
  deleteAction,
  initialContract,
  draftContract,
  submitLabel,
  resetOnSubmit = false,
  organizerOptions = [],
  suggestedContractNumber,
  canEditContractNumber = false,
  isEditLocked = false,
}: ContractFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const allowSubmitRef = useRef(false);
  const { push: pushToast } = useContractsToast();
  const { confirm, dialog } = useConfirmDialog();
  const seedContract = initialContract ?? draftContract ?? null;
  const isLocked = Boolean(initialContract) && isEditLocked;
  const initialTravelers = seedContract?.travelers?.length
    ? seedContract.travelers
    : [emptyTraveler];
  const [travelers, setTravelers] = useState<TripTraveler[]>(
    initialTravelers
  );
  const [contractItems, setContractItems] = useState(() =>
    parseContractItems(seedContract?.description)
  );
  const [contractNumberValue, setContractNumberValue] = useState(
    initialContract ? initialContract.contractNumber ?? "" : suggestedContractNumber ?? ""
  );
  const [titleValue, setTitleValue] = useState(
    seedContract?.title ?? seedContract?.clientName ?? ""
  );
  const [clientNameValue, setClientNameValue] = useState(
    seedContract?.clientName ?? seedContract?.title ?? ""
  );
  const [departureDateValue, setDepartureDateValue] = useState(
    seedContract?.departureDate ?? ""
  );
  const [liquidationDateValue, setLiquidationDateValue] = useState(
    seedContract?.liquidationDate ?? ""
  );
  const [isLiquidationAuto, setIsLiquidationAuto] = useState(
    !seedContract?.liquidationDate ||
      seedContract?.liquidationDate === seedContract?.departureDate
  );
  const [totalPriceValue, setTotalPriceValue] = useState(
    seedContract?.totalPrice ?? ""
  );
  const [firstPaymentValue, setFirstPaymentValue] = useState(
    seedContract?.firstPayment ?? ""
  );
  const [balanceDueValue, setBalanceDueValue] = useState(
    seedContract?.balanceDue ?? ""
  );
  const [isBalanceAuto, setIsBalanceAuto] = useState(true);

  const buildFileName = () => {
    const baseTitle =
      initialContract?.title || initialContract?.clientName || "Contrato";
    const suffix = initialContract?.contractNumber
      ? `- ${initialContract.contractNumber}`
      : "";
    const raw = `${baseTitle} ${suffix}`.trim();
    return raw.replace(/[^\w\s-]/g, "").replace(/\s+/g, " ").trim() || "Contrato";
  };

  const organizerChoices = useMemo(() => {
    const seen = new Set<string>();
    const options = organizerOptions
      .map((option) => ({
        value: option.value.trim(),
        label: option.label.trim(),
      }))
      .filter((option) => option.value)
      .filter((option) => {
        if (seen.has(option.value)) return false;
        seen.add(option.value);
        return true;
      });

    const currentOrganizer = seedContract?.organizer?.trim();
    if (currentOrganizer && !seen.has(currentOrganizer)) {
      options.unshift({
        value: currentOrganizer,
        label: `${currentOrganizer} (actual)`,
      });
    }

    return options;
  }, [seedContract?.organizer, organizerOptions]);

  const normalizedTravelers = useMemo(
    () =>
      travelers.map((traveler, index) => ({
        ...traveler,
        name: index === 0 ? clientNameValue : traveler.name,
        contract: contractNumberValue || traveler.contract,
      })),
    [travelers, contractNumberValue, clientNameValue]
  );
  const travelersPayload = useMemo(
    () => JSON.stringify(normalizedTravelers),
    [normalizedTravelers]
  );
  const descriptionPayload = useMemo(
    () =>
      contractItems
        .map((item) => {
          const qty = item.qty.trim();
          const details = item.details.trim();
          if (!details) return null;
          if (qty) return `${qty}x ${details}`;
          return details;
        })
        .filter(Boolean)
        .join("\n"),
    [contractItems]
  );
  const travelerCount = normalizedTravelers.filter(
    (traveler) => traveler.name || traveler.phone || traveler.contract
  ).length;

  const [passengerCountValue, setPassengerCountValue] = useState(
    seedContract?.passengerCount !== null && seedContract?.passengerCount !== undefined
      ? String(seedContract.passengerCount)
      : String(travelerCount)
  );
  const lastTravelerCount = useRef(travelerCount);

  useEffect(() => {
    if (passengerCountValue === String(lastTravelerCount.current)) {
      setPassengerCountValue(String(travelerCount));
    }
    lastTravelerCount.current = travelerCount;
  }, [travelerCount, passengerCountValue]);

  useEffect(() => {
    if (isLiquidationAuto) {
      setLiquidationDateValue(departureDateValue);
    }
  }, [departureDateValue, isLiquidationAuto]);

  useEffect(() => {
    if (!travelers.length) return;
    setTravelers((prev) => {
      const firstTraveler = prev[0];
      if (!firstTraveler) return prev;
      if (firstTraveler.name !== clientNameValue) {
        const next = [...prev];
        next[0] = { ...firstTraveler, name: clientNameValue };
        return next;
      }
      return prev;
    });
  }, [clientNameValue, travelers.length]);

  useEffect(() => {
    if (!isBalanceAuto) return;

    const total = parseMoney(totalPriceValue);
    const first = parseMoney(firstPaymentValue);

    if (total === null || first === null) {
      setBalanceDueValue("");
      return;
    }

    const computed = Math.max(total - first, 0);
    setBalanceDueValue(
      new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(computed)
    );
  }, [firstPaymentValue, totalPriceValue, isBalanceAuto]);

  const handleTravelerChange = (index: number, field: keyof TripTraveler, value: string) => {
    setTravelers((prev) =>
      prev.map((traveler, currentIndex) =>
        currentIndex === index ? { ...traveler, [field]: value } : traveler
      )
    );
  };

  const handleAddTraveler = () => {
    setTravelers((prev) => [
      ...prev,
      { ...emptyTraveler, contract: contractNumberValue },
    ]);
  };

  const handleRemoveTraveler = (index: number) => {
    setTravelers((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
  };

  const handleContractItemChange = (index: number, field: "qty" | "details", value: string) => {
    setContractItems((prev) =>
      prev.map((item, currentIndex) =>
        currentIndex === index ? { ...item, [field]: value } : item
      )
    );
  };

  const handleAddContractItem = () => {
    setContractItems((prev) => [...prev, { ...emptyContractItem }]);
  };

  const handleRemoveContractItem = (index: number) => {
    setContractItems((prev) =>
      prev.length === 1 ? prev : prev.filter((_, currentIndex) => currentIndex !== index)
    );
  };

  const resetFormState = () => {
    const baseContract = initialContract ?? seedContract;
    if (!initialContract) {
      if (baseContract) {
        setTravelers(
          baseContract.travelers?.length ? baseContract.travelers : [emptyTraveler]
        );
        setContractItems(parseContractItems(baseContract.description));
        setContractNumberValue(suggestedContractNumber ?? "");
        setTitleValue(baseContract.title ?? baseContract.clientName ?? "");
        setClientNameValue(baseContract.clientName ?? baseContract.title ?? "");
        setDepartureDateValue(baseContract.departureDate ?? "");
        setLiquidationDateValue(baseContract.liquidationDate ?? "");
        setIsLiquidationAuto(
          !baseContract.liquidationDate ||
            baseContract.liquidationDate === baseContract.departureDate
        );
        setTotalPriceValue(baseContract.totalPrice ?? "");
        setFirstPaymentValue(baseContract.firstPayment ?? "");
        setBalanceDueValue(baseContract.balanceDue ?? "");
        setIsBalanceAuto(true);
        const basePassengerCount =
          baseContract.passengerCount !== null && baseContract.passengerCount !== undefined
            ? String(baseContract.passengerCount)
            : String(
                (baseContract.travelers ?? []).filter(
                  (traveler) => traveler.name || traveler.phone || traveler.contract
                ).length
              );
        setPassengerCountValue(basePassengerCount);
        return;
      }

      setTravelers([emptyTraveler]);
      setContractItems([{ ...emptyContractItem }]);
      setTitleValue("");
      setContractNumberValue(suggestedContractNumber ?? "");
      setDepartureDateValue("");
      setLiquidationDateValue("");
      setIsLiquidationAuto(true);
      setTotalPriceValue("");
      setFirstPaymentValue("");
      setBalanceDueValue("");
      setIsBalanceAuto(true);
      setPassengerCountValue("0");
      return;
    }

    setTravelers(initialContract.travelers?.length ? initialContract.travelers : [emptyTraveler]);
      setContractItems(parseContractItems(initialContract.description));
      setContractNumberValue(initialContract.contractNumber ?? "");
      setTitleValue(initialContract.title ?? initialContract.clientName ?? "");
      setClientNameValue(initialContract.clientName ?? initialContract.title ?? "");
      setDepartureDateValue(initialContract.departureDate ?? "");
      setLiquidationDateValue(initialContract.liquidationDate ?? "");
    setIsLiquidationAuto(
      !initialContract.liquidationDate ||
        initialContract.liquidationDate === initialContract.departureDate
    );
    setTotalPriceValue(initialContract.totalPrice ?? "");
    setFirstPaymentValue(initialContract.firstPayment ?? "");
    setBalanceDueValue(initialContract.balanceDue ?? "");
    setIsBalanceAuto(true);
  };

  const handleReset = (event: FormEvent<HTMLFormElement>) => {
    resetFormState();
  };

  const handleDeleteClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const submitter = event.currentTarget;
    const label = initialContract?.title
      ? `el contrato ${initialContract.title}`
      : "este contrato";
    confirm(`Seguro que quieres eliminar ${label}?`, () => {
      pushToast("Contrato eliminado.", "info");
      allowSubmitRef.current = true;
      submitter.form?.requestSubmit(submitter);
    });
  };

  const handleCollapseForm = () => {
    const detailsElement = formRef.current?.closest("details");
    if (detailsElement && detailsElement.hasAttribute("open")) {
      detailsElement.removeAttribute("open");
      detailsElement.scrollIntoView({ block: "start", behavior: "smooth" });
    }
  };

  const [formState, formAction] = useActionState(action, {
    submittedAt: 0,
    error: "",
    field: undefined,
  });
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isOpeningPdf, setIsOpeningPdf] = useState(false);
  const [isSendingPdf, setIsSendingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [contractNumberError, setContractNumberError] = useState<string | null>(null);
  const contractNumberToastRef = useRef<string | null>(null);

  const getSubmitConfirmMessage = () => {
    if (initialContract) return "Seguro que quieres guardar los cambios?";
    return "Seguro que quieres crear el contrato?";
  };

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (isLocked) {
      event.preventDefault();
      event.stopPropagation();
      pushToast("Este contrato ya no se puede editar.", "info");
      return;
    }
    const nativeEvent = event.nativeEvent as SubmitEvent | undefined;
    const submitter = nativeEvent?.submitter as HTMLButtonElement | null;
    if (submitter?.dataset.skipConfirm === "true") return;

    if (allowSubmitRef.current) {
      allowSubmitRef.current = false;
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    confirm(getSubmitConfirmMessage(), () => {
      allowSubmitRef.current = true;
      if (submitter) {
        submitter.form?.requestSubmit(submitter);
      } else {
        formRef.current?.requestSubmit();
      }
    }, {
      title: "Confirmar acciÃ³n",
      confirmLabel: "Si",
      cancelLabel: "No",
      ...(initialContract
        ? {}
        : { note: "Este contrato no se podra editar despues de 36hrs." }),
    });
  };

  useEffect(() => {
    if (!resetOnSubmit) return;
    if (!formState.submittedAt) return;
    resetFormState();
    formRef.current?.reset();
  }, [formState.submittedAt, resetOnSubmit]);

  useEffect(() => {
    if (!formState.submittedAt) return;
    const message = initialContract ? "Cambios guardados." : "Contrato creado.";
    pushToast(message);
  }, [formState.submittedAt, initialContract, pushToast]);

  useEffect(() => {
    if (formState.field === "contractNumber") {
      const message = formState.error ?? null;
      setContractNumberError(message);
      if (message && contractNumberToastRef.current !== message) {
        pushToast(message, "error");
        contractNumberToastRef.current = message;
      }
      return;
    }
    setContractNumberError(null);
    contractNumberToastRef.current = null;
    if (!formState.error) return;
    pushToast(formState.error, "error");
  }, [formState.error, formState.field, pushToast]);

  const handleGeneratePdf = async () => {
    if (!initialContract) return;
    setIsGeneratingPdf(true);
    setPdfError(null);
    try {
      const response = await fetch(`/api/admin/contracts/${initialContract.id}/pdf`, {
        method: "POST",
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setPdfError(payload.error || "No se pudo generar el PDF.");
        return;
      }
      pushToast("PDF generado.");
      router.refresh();
    } catch (error) {
      setPdfError("No se pudo generar el PDF.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleOpenPdf = async () => {
    if (!initialContract) return;
    setIsOpeningPdf(true);
    setPdfError(null);
    try {
      const response = await fetch(`/api/admin/contracts/${initialContract.id}/pdf`);
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setPdfError(payload.error || "No se pudo abrir el PDF.");
        return;
      }
      const payload = await response.json();
      if (payload?.signedUrl) {
        window.open(payload.signedUrl as string, "_blank", "noopener,noreferrer");
      } else {
        setPdfError("No se pudo abrir el PDF.");
      }
    } catch (error) {
      setPdfError("No se pudo abrir el PDF.");
    } finally {
      setIsOpeningPdf(false);
    }
  };

  const handleSendPdf = async () => {
    if (!initialContract) return;
    setIsSendingPdf(true);
    setPdfError(null);
    try {
      const response = await fetch(`/api/admin/contracts/${initialContract.id}/pdf`, {
        method: "POST",
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setPdfError(payload.error || "No se pudo generar el PDF.");
        return;
      }
      const payload = await response.json();
      const signedUrl = payload?.signedUrl as string | undefined;
      if (!signedUrl) {
        setPdfError("No se pudo obtener el PDF.");
        return;
      }

      const fileResponse = await fetch(signedUrl);
      if (!fileResponse.ok) {
        setPdfError("No se pudo descargar el PDF.");
        return;
      }
      const blob = await fileResponse.blob();
      const file = new File([blob], `${buildFileName()}.pdf`, {
        type: blob.type || "application/pdf",
      });

      if (
        typeof navigator !== "undefined" &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        try {
          await navigator.share({
            files: [file],
            title: initialContract.title || "Contrato",
            text: "Contrato adjunto",
          });
          pushToast("PDF listo para enviar.");
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") {
            return;
          }
        }
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${buildFileName()}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      const message = `Adjunto contrato ${initialContract.title || ""}.`;
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, "_blank", "noopener,noreferrer");
      pushToast("PDF descargado. Adjunta el archivo en WhatsApp.");
    } catch (error) {
      setPdfError("No se pudo preparar el envÃ­o.");
    } finally {
      setIsSendingPdf(false);
    }
  };

  const handleGeneratePdfClick = () => {
    if (!initialContract || isGeneratingPdf) return;
    confirm("Seguro que quieres generar el PDF?", () => {
      void handleGeneratePdf();
    }, {
      title: "Generar PDF",
      confirmLabel: "Si",
      cancelLabel: "No",
    });
  };

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={handleFormSubmit}
      onReset={handleReset}
      className={`grid gap-4 md:grid-cols-2 ${isLocked ? "opacity-75" : ""}`}
    >
      {initialContract ? <input type="hidden" name="id" value={initialContract.id} /> : null}
      <input type="hidden" name="travelers" value={travelersPayload} />
      <input type="hidden" name="description" value={descriptionPayload} />

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
          TÃ­tulo del contrato
        </label>
        <input
          name="title"
          required
          value={titleValue}
          onChange={(event) => setTitleValue(event.target.value)}
          placeholder="Nombre completo"
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
          NÃºmero de contrato
        </label>
        <input
          name="contractNumber"
          value={contractNumberValue}
          onChange={(event) => {
            setContractNumberValue(event.target.value.replace(/[^\d]/g, ""));
            setContractNumberError(null);
            contractNumberToastRef.current = null;
          }}
          placeholder="#00-00"
          inputMode="numeric"
          readOnly={!canEditContractNumber}
          aria-readonly={!canEditContractNumber}
          className={`w-full rounded-2xl border px-4 py-3 text-sm ${
            contractNumberError
              ? "border-rose-300 text-rose-700 focus-visible:border-rose-400 focus-visible:ring-2 focus-visible:ring-rose-200"
              : "border-slate-200"
          }`}
        />
        {canEditContractNumber && suggestedContractNumber ? (
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            Folio sugerido: {suggestedContractNumber}
          </p>
        ) : null}
        {canEditContractNumber &&
        suggestedContractNumber &&
        contractNumberValue &&
        contractNumberValue !== suggestedContractNumber ? (
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-500">
            EstÃ¡s usando un folio distinto al sugerido.
          </p>
        ) : null}
        {contractNumberError ? (
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-500">
            {contractNumberError}
          </p>
        ) : null}
        {!canEditContractNumber ? (
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            Se asigna automÃ¡ticamente
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
          Fecha de reserva
        </label>
        <input
          type="date"
          name="reservationDate"
          required
          defaultValue={seedContract?.reservationDate ?? ""}
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
          Nombre del cliente
        </label>
        <input
          name="clientName"
          required
          value={clientNameValue}
          onChange={(event) => setClientNameValue(event.target.value)}
          placeholder="Nombre del cliente"
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
          Destino
        </label>
        <input
          name="destination"
          required
          defaultValue={seedContract?.destination ?? ""}
          placeholder="CancÃºn"
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
          Agencia
        </label>
        <ThemedSelect
          name="agency"
          defaultValue={seedContract?.agency ?? ""}
          placeholder="Selecciona una agencia"
          options={[
            { value: "AlvVaz AviaciÃ³n", label: "AlvVaz AviaciÃ³n" },
            { value: "AlvVaz Oriente", label: "AlvVaz Oriente" },
          ]}
          buttonClassName="admin-select w-full rounded-2xl border border-brand-200 bg-gradient-to-b from-white to-brand-50/40 px-4 py-3 text-sm text-brand-900 shadow-sm"
          selectClassName="admin-select w-full rounded-2xl border border-brand-200 bg-gradient-to-b from-white to-brand-50/40 px-4 py-3 text-sm text-brand-900 shadow-sm"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
          Hotel
        </label>
        <input
          name="hotel"
          defaultValue={seedContract?.hotel ?? ""}
          placeholder="Hotel seleccionado"
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
          Proveedor
        </label>
        <input
          name="supplier"
          defaultValue={seedContract?.supplier ?? ""}
          placeholder="Proveedor"
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
          QuiÃ©n organizÃ³ / vendiÃ³
        </label>
        {organizerChoices.length > 0 ? (
          <ThemedSelect
            name="organizer"
            defaultValue={seedContract?.organizer ?? ""}
            placeholder="Selecciona un usuario"
            options={organizerChoices}
          />
        ) : (
          <input
            name="organizer"
            defaultValue={seedContract?.organizer ?? ""}
            placeholder="Asesor o agencia"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
          />
        )}
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
          NÃºmero de pasajeros
        </label>
        <input
          type="number"
          min={0}
          name="passengerCount"
          value={passengerCountValue}
          onChange={(event) => setPassengerCountValue(event.target.value)}
          onWheel={preventNumberInputWheel}
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
        />
        <p className="text-xs text-slate-500">
          Se actualiza con la lista; puedes ajustar si aÃºn no tienes todos los nombres.
        </p>
      </div>

      <div className="space-y-2 md:col-span-2">
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
          Pasajeros en lista ({travelerCount})
        </label>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="space-y-3">
            {travelers.map((traveler, index) => (
              <div key={index} className="grid gap-3 md:grid-cols-3">
                <input
                  placeholder="Nombre"
                  value={index === 0 ? clientNameValue : traveler.name}
                  onChange={(event) =>
                    index === 0
                      ? null
                      : handleTravelerChange(index, "name", event.target.value)
                  }
                  readOnly={index === 0}
                  className={
                    index === 0
                      ? "w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
                      : "w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                  }
                />
                <input
                  placeholder="TelÃ©fono"
                  value={traveler.phone}
                  onChange={(event) => handleTravelerChange(index, "phone", event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                />
                <div className="flex gap-2">
                  <input
                    placeholder="Contrato / referencia"
                    value={contractNumberValue}
                    readOnly
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
                  />
                  {travelers.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => handleRemoveTraveler(index)}
                      className="rounded-full border border-slate-200 px-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500"
                    >
                      -
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={handleAddTraveler}
            className="mt-3 rounded-full border border-brand-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700"
          >
            + Agregar persona
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
          Fecha de salida
        </label>
        <input
          type="date"
          name="departureDate"
          value={departureDateValue}
          onChange={(event) => setDepartureDateValue(event.target.value)}
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
          Fecha de regreso
        </label>
        <input
          type="date"
          name="returnDate"
          defaultValue={seedContract?.returnDate ?? ""}
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
        />
      </div>

      <div className="md:col-span-2 space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
          DescripciÃ³n de lo contratado y costos
        </label>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="grid md:grid-cols-[minmax(0,1fr)_220px]">
            <div className="border-b border-slate-200 md:border-b-0 md:border-r">
              <div className="grid grid-cols-[90px_minmax(0,1fr)] bg-slate-50 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                <div className="border-r border-slate-200 px-3 py-2">Cant.</div>
                <div className="px-3 py-2">DescripciÃ³n de lo contratado</div>
              </div>
              <div className="divide-y divide-slate-200">
                {contractItems.map((item, index) => (
                  <div key={index} className="grid grid-cols-[90px_minmax(0,1fr)]">
                    <div className="border-r border-slate-200 px-3 py-3">
                      <div className="flex flex-col gap-2">
                        <input
                          type="number"
                          min={1}
                          value={item.qty}
                          onChange={(event) =>
                            handleContractItemChange(index, "qty", event.target.value)
                          }
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        />
                        {contractItems.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => handleRemoveContractItem(index)}
                            className="rounded-full border border-slate-200 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500"
                          >
                            Quitar
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <div className="px-3 py-3">
                      <textarea
                        value={item.details}
                        onChange={(event) =>
                          handleContractItemChange(index, "details", event.target.value)
                        }
                        placeholder="Describe el paquete, habitaciones, vuelos, traslados..."
                        className="min-h-[110px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-200 px-3 py-3">
                <button
                  type="button"
                  onClick={handleAddContractItem}
                  className="rounded-full border border-brand-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700"
                >
                  + Agregar item
                </button>
              </div>
            </div>
            <div className="px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                Costos
              </p>
              <div className="mt-3 flex flex-col gap-3">
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Precio neto
                  </p>
                  <input
                    name="totalPrice"
                    value={totalPriceValue}
                    onChange={(event) => {
                      setTotalPriceValue(event.target.value);
                      setIsBalanceAuto(true);
                    }}
                    onBlur={(event) => setTotalPriceValue(formatMoney(event.target.value))}
                    placeholder="MXN"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-right"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Primer pago
                  </p>
                  <input
                    name="firstPayment"
                    value={firstPaymentValue}
                    onChange={(event) => {
                      setFirstPaymentValue(event.target.value);
                      setIsBalanceAuto(true);
                    }}
                    onBlur={(event) => setFirstPaymentValue(formatMoney(event.target.value))}
                    placeholder="MXN"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-right"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Resto por pagar
                  </p>
                  <input
                    name="balanceDue"
                    value={balanceDueValue}
                    onChange={(event) => {
                      setBalanceDueValue(event.target.value);
                      setIsBalanceAuto(false);
                    }}
                    onBlur={(event) => setBalanceDueValue(formatMoney(event.target.value))}
                    placeholder="MXN"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-right"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="md:col-span-2 space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
          Notas
        </label>
        <textarea
          name="notes"
          defaultValue={seedContract?.notes ?? ""}
          placeholder="Agrega clÃ¡usulas, observaciones o notas internas."
          className="min-h-[120px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
          LiquidaciÃ³n del viaje
        </label>
        <input
          type="date"
          name="liquidationDate"
          value={liquidationDateValue}
          onChange={(event) => {
            setLiquidationDateValue(event.target.value);
            setIsLiquidationAuto(false);
          }}
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
        />
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
        {(() => {
          const currentStatus =
            seedContract?.status ??
            (seedContract?.isPaid ? "paid" : seedContract?.isSigned ? "signed" : "");
          return (
            <>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="status"
            value="signed"
            defaultChecked={currentStatus === "signed"}
          />
          Firmado
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="status"
            value="paid"
            defaultChecked={currentStatus === "paid"}
          />
          Pagado
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="status"
            value="pending"
            defaultChecked={currentStatus === "pending"}
          />
          Pendiente
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="status"
            value="canceled"
            defaultChecked={currentStatus === "canceled"}
          />
          Cancelado
        </label>
            </>
          );
        })()}
      </div>

      {isLocked ? (
        <p className="md:col-span-2 text-[11px] uppercase tracking-[0.18em] text-slate-400">
          Edicion disponible solo durante los primeros 3 dias para rol admin.
        </p>
      ) : null}

      {initialContract ? (
        <div className="md:col-span-2 rounded-2xl border border-brand-200 bg-white/70 p-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                Contratos PDF
              </p>
              <p className="text-xs text-slate-600">
                Genera un PDF listo para enviar al cliente.
              </p>
            </div>
            <div className="flex sm:justify-end sm:pt-3">
              <button
                type="button"
                onClick={handleGeneratePdfClick}
                disabled={isGeneratingPdf}
                className="rounded-full border border-brand-300 px-4 py-2.5 text-xs font-semibold uppercase leading-none tracking-[0.2em] text-brand-700 transition hover:border-brand-400"
              >
                {isGeneratingPdf ? "Generando..." : "Generar PDF"}
              </button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-600">
            {initialContract.storagePath ? (
              <>
                <button
                  type="button"
                  onClick={handleOpenPdf}
                  disabled={isOpeningPdf}
                  className="rounded-full border border-brand-200 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-700"
                >
                  {isOpeningPdf ? "Abriendo..." : "Ver PDF"}
                </button>
                <button
                  type="button"
                  onClick={handleSendPdf}
                  disabled={isSendingPdf}
                  className="rounded-full border border-brand-200 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-700"
                >
                  {isSendingPdf ? "Enviando..." : "Enviar"}
                </button>
              </>
            ) : (
              <span className="rounded-full border border-slate-200 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                AÃºn no se genera PDF
              </span>
            )}
            {pdfError ? <span className="text-rose-600">{pdfError}</span> : null}
          </div>
        </div>
      ) : (
        <div className="md:col-span-2 rounded-2xl border border-dashed border-brand-200 bg-white/70 p-4 text-xs text-slate-600">
          El PDF final se generarÃ¡ desde la plantilla y se almacenarÃ¡ en Supabase.
        </div>
      )}

      <div className="md:col-span-2 flex flex-wrap items-center justify-end gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={handleCollapseForm}
          className="border-brand-200 text-brand-700 hover:border-brand-300 hover:text-brand-900"
        >
          Cerrar
        </Button>
        <Button type="submit" disabled={isLocked}>{submitLabel}</Button>
        {deleteAction ? (
          <Button
            type="submit"
            formAction={deleteAction}
            variant="subtle"
            className="border border-rose-300 bg-rose-50 text-rose-700 shadow-sm hover:border-rose-400 hover:text-rose-800"
            data-skip-confirm="true"
            onClick={handleDeleteClick}
            disabled={isLocked}
          >
            Eliminar
          </Button>
        ) : null}
      </div>
      {dialog}
    </form>
  );
}

