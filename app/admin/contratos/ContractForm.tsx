"use client";

import type { FormEvent } from "react";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type { Contract, TripTraveler } from "@/lib/db";
import { Button } from "@/components/ui/button";

type ContractFormProps = {
  action: (
    prevState: { submittedAt: number },
    formData: FormData
  ) => Promise<{ submittedAt: number }>;
  deleteAction?: (formData: FormData) => void;
  initialContract?: Contract;
  submitLabel: string;
  resetOnSubmit?: boolean;
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
  submitLabel,
  resetOnSubmit = false,
}: ContractFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [travelers, setTravelers] = useState<TripTraveler[]>(
    initialContract?.travelers?.length ? initialContract.travelers : [emptyTraveler]
  );
  const [contractItems, setContractItems] = useState(() =>
    parseContractItems(initialContract?.description)
  );
  const [contractNumberValue, setContractNumberValue] = useState(
    initialContract?.contractNumber ?? ""
  );
  const [titleValue, setTitleValue] = useState(
    initialContract?.title ?? initialContract?.clientName ?? ""
  );
  const [departureDateValue, setDepartureDateValue] = useState(
    initialContract?.departureDate ?? ""
  );
  const [liquidationDateValue, setLiquidationDateValue] = useState(
    initialContract?.liquidationDate ?? ""
  );
  const [isLiquidationAuto, setIsLiquidationAuto] = useState(
    !initialContract?.liquidationDate ||
      initialContract?.liquidationDate === initialContract?.departureDate
  );
  const [totalPriceValue, setTotalPriceValue] = useState(
    initialContract?.totalPrice ?? ""
  );
  const [firstPaymentValue, setFirstPaymentValue] = useState(
    initialContract?.firstPayment ?? ""
  );
  const [balanceDueValue, setBalanceDueValue] = useState(
    initialContract?.balanceDue ?? ""
  );
  const [isBalanceAuto, setIsBalanceAuto] = useState(true);

  const normalizedTravelers = useMemo(
    () =>
      travelers.map((traveler, index) => ({
        ...traveler,
        name: index === 0 ? titleValue : traveler.name,
        contract: contractNumberValue || traveler.contract,
      })),
    [travelers, contractNumberValue, titleValue]
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
    initialContract?.passengerCount !== null && initialContract?.passengerCount !== undefined
      ? String(initialContract.passengerCount)
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
      if (!firstTraveler.name || firstTraveler.name === titleValue) {
        const next = [...prev];
        next[0] = { ...firstTraveler, name: titleValue };
        return next;
      }
      return prev;
    });
  }, [titleValue, travelers.length]);

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
    if (!initialContract) {
      setTravelers([emptyTraveler]);
      setContractItems([{ ...emptyContractItem }]);
      setTitleValue("");
      setContractNumberValue("");
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

  const [formState, formAction] = useActionState(action, { submittedAt: 0 });
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isOpeningPdf, setIsOpeningPdf] = useState(false);
  const [isSendingPdf, setIsSendingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ message: string; tone: "success" | "info" } | null>(
    null
  );

  const pushNotice = (message: string, tone: "success" | "info" = "success") => {
    setNotice({ message, tone });
    if (noticeTimerRef.current) {
      clearTimeout(noticeTimerRef.current);
    }
    noticeTimerRef.current = setTimeout(() => {
      setNotice(null);
    }, 3500);
  };

  useEffect(() => {
    if (!resetOnSubmit) return;
    if (!formState.submittedAt) return;
    resetFormState();
    formRef.current?.reset();
  }, [formState.submittedAt, resetOnSubmit]);

  useEffect(() => {
    if (!formState.submittedAt) return;
    pushNotice("Cambios guardados.");
  }, [formState.submittedAt]);

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
      pushNotice("PDF generado.");
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
      const origin = window.location.origin;
      const shareUrl = `${origin}/contratos/${initialContract.id}/pdf`;
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      }
      const message = `Hola, aquí está tu contrato: ${shareUrl}`;
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      setPdfError("No se pudo preparar el envío.");
    } finally {
      setIsSendingPdf(false);
    }
  };

  return (
    <form
      ref={formRef}
      action={formAction}
      onReset={handleReset}
      className="grid gap-4 md:grid-cols-2"
    >
      {initialContract ? <input type="hidden" name="id" value={initialContract.id} /> : null}
      <input type="hidden" name="travelers" value={travelersPayload} />
      <input type="hidden" name="description" value={descriptionPayload} />
      <input type="hidden" name="clientName" value={titleValue} />
      {notice ? (
        <div
          className={`md:col-span-2 rounded-2xl border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] ${
            notice.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-brand-200 bg-brand-50 text-brand-700"
          }`}
        >
          {notice.message}
        </div>
      ) : null}

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
          Título del contrato
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
          Número de contrato
        </label>
        <input
          name="contractNumber"
          value={contractNumberValue}
          onChange={(event) => setContractNumberValue(event.target.value)}
          placeholder="#00-00"
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
          Fecha de reserva
        </label>
        <input
          type="date"
          name="reservationDate"
          defaultValue={initialContract?.reservationDate ?? ""}
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
          Agencia
        </label>
        <select
          name="agency"
          defaultValue={initialContract?.agency ?? ""}
          className="admin-select w-full rounded-2xl border border-brand-200 bg-gradient-to-b from-white to-brand-50/40 px-4 py-3 text-sm text-brand-900 shadow-sm outline-none transition focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-200"
        >
          <option value="" disabled>
            Selecciona una agencia
          </option>
          <option value="AlvVaz Aviación">AlvVaz Aviación</option>
          <option value="AlvVaz Oriente">AlvVaz Oriente</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
          Destino
        </label>
        <input
          name="destination"
          required
          defaultValue={initialContract?.destination ?? ""}
          placeholder="Cancún"
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
          Hotel
        </label>
        <input
          name="hotel"
          defaultValue={initialContract?.hotel ?? ""}
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
          defaultValue={initialContract?.supplier ?? ""}
          placeholder="Proveedor"
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
          Quién organizó / vendió
        </label>
        <input
          name="organizer"
          defaultValue={initialContract?.organizer ?? ""}
          placeholder="Asesor o agencia"
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
          Número de pasajeros
        </label>
        <input
          type="number"
          min={0}
          name="passengerCount"
          value={passengerCountValue}
          onChange={(event) => setPassengerCountValue(event.target.value)}
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
        />
        <p className="text-xs text-slate-500">
          Se actualiza con la lista; puedes ajustar si aún no tienes todos los nombres.
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
                  value={index === 0 ? titleValue : traveler.name}
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
                  placeholder="Teléfono"
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
          defaultValue={initialContract?.returnDate ?? ""}
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
        />
      </div>

      <div className="md:col-span-2 space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
          Descripción de lo contratado y costos
        </label>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="grid md:grid-cols-[minmax(0,1fr)_220px]">
            <div className="border-b border-slate-200 md:border-b-0 md:border-r">
              <div className="grid grid-cols-[90px_minmax(0,1fr)] bg-slate-50 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                <div className="border-r border-slate-200 px-3 py-2">Cant.</div>
                <div className="px-3 py-2">Descripción de lo contratado</div>
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

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
          Liquidación del viaje
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
            initialContract?.status ??
            (initialContract?.isPaid ? "paid" : initialContract?.isSigned ? "signed" : "");
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
            </>
          );
        })()}
      </div>

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
                onClick={handleGeneratePdf}
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
                Aún no se genera PDF
              </span>
            )}
            {pdfError ? <span className="text-rose-600">{pdfError}</span> : null}
          </div>
        </div>
      ) : (
        <div className="md:col-span-2 rounded-2xl border border-dashed border-brand-200 bg-white/70 p-4 text-xs text-slate-600">
          El PDF final se generará desde la plantilla y se almacenará en Supabase.
        </div>
      )}

      <div className="md:col-span-2 flex flex-wrap items-center justify-end gap-3">
        <Button type="submit">{submitLabel}</Button>
        {deleteAction ? (
          <Button
            type="submit"
            formAction={deleteAction}
            variant="subtle"
            onClick={() => pushNotice("Contrato eliminado.", "info")}
          >
            Eliminar
          </Button>
        ) : null}
      </div>
    </form>
  );
}
