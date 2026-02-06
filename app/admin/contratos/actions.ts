"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

import { getAdminFromCookies } from "@/lib/auth/admin";
import {
  createTrip,
  createContract,
  deleteContract,
  deleteContractsByIds,
  getContracts,
  updateContract,
  syncClientsFromTravelers,
  type TripTraveler,
} from "@/lib/db";
import type { ContractStatus } from "@/lib/db";
import { prisma } from "@/lib/prisma";

type ActionState = { submittedAt: number; error?: string; field?: "contractNumber" | "general" };

const MIN_CONTRACT_NUMBER = 2141;

const normalizeContractNumber = (value: string) => {
  const digits = value.replace(/[^\d]/g, "").trim();
  return digits ? digits : null;
};

const isUniqueConstraintError = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";

const getMaxContractNumber = async () => {
  const result = await prisma.$queryRaw<{ max: number | null }[]>`
    SELECT MAX(CAST("contractNumber" AS INTEGER)) AS max
    FROM "Contract"
    WHERE "contractNumber" ~ '^[0-9]+$'
  `;
  const max = result[0]?.max ?? 0;
  return Math.max(max, MIN_CONTRACT_NUMBER);
};

function parseTravelers(raw: string): TripTraveler[] {
  try {
    const parsed = JSON.parse(raw) as TripTraveler[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export async function createContractAction(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await getAdminFromCookies();
  if (!admin) {
    return { ...prevState, error: "Sesión no válida. Inicia sesión de nuevo." };
  }

  const title = String(formData.get("title") ?? "").trim();
  const contractNumber = String(formData.get("contractNumber") ?? "").trim();
  const reservationDate = String(formData.get("reservationDate") ?? "").trim();
  const seller = String(formData.get("seller") ?? "").trim();
  const agency = String(formData.get("agency") ?? "").trim();
  const clientName = String(formData.get("clientName") ?? "").trim();
  const destination = String(formData.get("destination") ?? "").trim();
  const hotel = String(formData.get("hotel") ?? "").trim();
  const supplier = String(formData.get("supplier") ?? "").trim();
  const organizer = String(formData.get("organizer") ?? "").trim();
  const passengerCountRaw = String(formData.get("passengerCount") ?? "").trim();
  const passengerCount = Number(passengerCountRaw);
  const departureDate = String(formData.get("departureDate") ?? "").trim();
  const returnDate = String(formData.get("returnDate") ?? "").trim();
  const travelersRaw = String(formData.get("travelers") ?? "[]");
  const description = String(formData.get("description") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const totalPrice = String(formData.get("totalPrice") ?? "").trim();
  const firstPayment = String(formData.get("firstPayment") ?? "").trim();
  const balanceDue = String(formData.get("balanceDue") ?? "").trim();
  const liquidationDate = String(formData.get("liquidationDate") ?? "").trim();
  const statusRaw = String(formData.get("status") ?? "pending").trim();
  const status: ContractStatus =
    statusRaw === "signed" || statusRaw === "paid" || statusRaw === "canceled"
      ? statusRaw
      : "pending";
  const isSigned = status === "signed" || status === "paid";
  const isPaid = status === "paid";

  if (!title || !clientName || !destination || !reservationDate) return prevState;

  const travelers = parseTravelers(travelersRaw);
  const canEditContractNumber = admin.role === "owner";
  const normalizedContractNumber = normalizeContractNumber(contractNumber);
  const applyContractNumber = (value: string | null) =>
    travelers.map((traveler) => ({
      ...traveler,
      contract: value || traveler.contract || "",
    }));

  const resolvedSeller = seller || organizer;
  const basePayload = {
    title,
    reservationDate: reservationDate || null,
    seller: resolvedSeller || null,
    agency: agency || null,
    clientName,
    destination,
    hotel: hotel || null,
    supplier: supplier || null,
    organizer: organizer || null,
    passengerCount: Number.isFinite(passengerCount) ? passengerCount : travelers.length || null,
    departureDate: departureDate || null,
    returnDate: returnDate || null,
    description: description || null,
    notes: notes || null,
    totalPrice: totalPrice || null,
    firstPayment: firstPayment || null,
    balanceDue: balanceDue || null,
    liquidationDate: liquidationDate || null,
    status,
    isSigned,
    isPaid,
    fileUrl: null,
    storageBucket: null,
    storagePath: null,
    mimeType: null,
    metadata: {},
  };

  const manualContractNumber = canEditContractNumber ? normalizedContractNumber : null;
  let createdContract: Awaited<ReturnType<typeof createContract>> | null = null;
  let assignedTravelers: TripTraveler[] = travelers;

  if (manualContractNumber) {
    const existing = await prisma.contract.findFirst({
      where: { contractNumber: manualContractNumber },
    });
    if (existing) {
      return { ...prevState, error: "Este folio ya existe.", field: "contractNumber" };
    }
    try {
      assignedTravelers = applyContractNumber(manualContractNumber);
      createdContract = await createContract({
        ...basePayload,
        contractNumber: manualContractNumber,
        travelers: assignedTravelers,
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        return { ...prevState, error: "Este folio ya existe.", field: "contractNumber" };
      }
      throw error;
    }
  } else {
    const maxAttempts = 3;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const nextNumberValue = (await getMaxContractNumber()) + 1;
      const nextNumber = String(nextNumberValue).padStart(4, "0");
      try {
        assignedTravelers = applyContractNumber(nextNumber);
        createdContract = await createContract({
          ...basePayload,
          contractNumber: nextNumber,
          travelers: assignedTravelers,
        });
        break;
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          continue;
        }
        throw error;
      }
    }
  }

  if (!createdContract) {
    return { ...prevState, error: "No se pudo asignar el folio. Intenta de nuevo." };
  }

  const trip = await createTrip({
    clientName,
    destination,
    hotel: hotel || undefined,
    supplier: supplier || undefined,
    organizer: organizer || undefined,
    passengerCount: Number.isFinite(passengerCount) ? passengerCount : travelers.length || 0,
    departureDate: departureDate || null,
    returnDate: returnDate || null,
    travelers: assignedTravelers,
  });

  await updateContract(createdContract.id, { tripId: trip.id });
  const primaryTraveler = clientName
    ? [
        {
          name: clientName,
          phone: travelers[0]?.phone || "",
          contract: createdContract.contractNumber || "",
        },
      ]
    : [];

  await syncClientsFromTravelers(primaryTraveler, {
    source: "contract",
    destination,
    hotel,
    supplier,
    organizer,
    agency,
  });

  // TODO: Generate PDF from template and upload to storage.
  revalidatePath("/admin/contratos");
  revalidatePath("/admin/viajes");
  revalidatePath("/admin/clients");
  return { submittedAt: Date.now(), error: "" };
}

export async function updateContractAction(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await getAdminFromCookies();
  if (!admin) {
    return { ...prevState, error: "Sesión no válida. Inicia sesión de nuevo." };
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return prevState;

  const title = String(formData.get("title") ?? "").trim();
  const contractNumber = String(formData.get("contractNumber") ?? "").trim();
  const reservationDate = String(formData.get("reservationDate") ?? "").trim();
  const seller = String(formData.get("seller") ?? "").trim();
  const agency = String(formData.get("agency") ?? "").trim();
  const clientName = String(formData.get("clientName") ?? "").trim();
  const destination = String(formData.get("destination") ?? "").trim();
  const hotel = String(formData.get("hotel") ?? "").trim();
  const supplier = String(formData.get("supplier") ?? "").trim();
  const organizer = String(formData.get("organizer") ?? "").trim();
  const passengerCountRaw = String(formData.get("passengerCount") ?? "").trim();
  const passengerCount = Number(passengerCountRaw);
  const departureDate = String(formData.get("departureDate") ?? "").trim();
  const returnDate = String(formData.get("returnDate") ?? "").trim();
  const travelersRaw = String(formData.get("travelers") ?? "[]");
  const description = String(formData.get("description") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const totalPrice = String(formData.get("totalPrice") ?? "").trim();
  const firstPayment = String(formData.get("firstPayment") ?? "").trim();
  const balanceDue = String(formData.get("balanceDue") ?? "").trim();
  const liquidationDate = String(formData.get("liquidationDate") ?? "").trim();
  const statusRaw = String(formData.get("status") ?? "pending").trim();
  const status: ContractStatus =
    statusRaw === "signed" || statusRaw === "paid" || statusRaw === "canceled"
      ? statusRaw
      : "pending";
  const isSigned = status === "signed" || status === "paid";
  const isPaid = status === "paid";

  if (!title || !clientName || !destination || !reservationDate) return prevState;

  const travelers = parseTravelers(travelersRaw);
  const canEditContractNumber = admin.role === "owner";
  const normalizedContractNumber = normalizeContractNumber(contractNumber);
  const contractNumberUpdate = canEditContractNumber ? normalizedContractNumber : undefined;

  if (canEditContractNumber && normalizedContractNumber) {
    const existing = await prisma.contract.findFirst({
      where: {
        contractNumber: normalizedContractNumber,
        NOT: { id },
      },
    });
    if (existing) {
      return { ...prevState, error: "Este folio ya existe.", field: "contractNumber" };
    }
  }

  const resolvedSeller = seller || organizer;
  let updated: Awaited<ReturnType<typeof updateContract>> | null = null;
  try {
    updated = await updateContract(id, {
      title,
      ...(contractNumberUpdate !== undefined ? { contractNumber: contractNumberUpdate } : {}),
      reservationDate: reservationDate || null,
      seller: resolvedSeller || null,
      agency: agency || null,
      clientName: clientName || "",
      destination: destination || "",
      hotel: hotel || null,
      supplier: supplier || null,
      organizer: organizer || null,
      passengerCount: Number.isFinite(passengerCount) ? passengerCount : travelers.length || null,
      departureDate: departureDate || null,
      returnDate: returnDate || null,
      travelers,
      description: description || null,
      notes: notes || null,
      totalPrice: totalPrice || null,
      firstPayment: firstPayment || null,
      balanceDue: balanceDue || null,
      liquidationDate: liquidationDate || null,
      status,
      isSigned,
      isPaid,
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { ...prevState, error: "Este folio ya existe.", field: "contractNumber" };
    }
    throw error;
  }

  if (updated && updated.status === "paid" && !updated.tripId) {
    // TODO: Auto-generate a trip once the contract is approved.
  }

  const primaryTraveler = clientName
    ? [
        {
          name: clientName,
          phone: travelers[0]?.phone || "",
          contract: updated?.contractNumber || "",
        },
      ]
    : [];

  await syncClientsFromTravelers(primaryTraveler, {
    source: "contract",
    destination,
    hotel,
    supplier,
    organizer,
    agency,
  });

  revalidatePath("/admin/contratos");
  revalidatePath("/admin/clients");
  return { submittedAt: Date.now(), error: "" };
}

export async function deleteContractAction(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  await deleteContract(id);
  revalidatePath("/admin/contratos");
}

export async function bulkDeleteContractsAction(ids: string[]) {
  if (!ids.length) {
    return { ok: false, error: "Selecciona al menos un contrato." };
  }
  await deleteContractsByIds(ids);
  revalidatePath("/admin/contratos");
  return { ok: true };
}

export async function syncClientsFromContractsAction(
  _prevState: { updatedAt: number; ok: boolean; error?: string }
) {
  try {
    const contracts = await getContracts();

    for (const contract of contracts) {
      const travelersForSync =
        contract.travelers.length > 0
          ? contract.travelers
          : contract.clientName
          ? [{ name: contract.clientName, phone: "", contract: contract.contractNumber || "" }]
          : [];
      await syncClientsFromTravelers(travelersForSync, {
        source: "contract",
        destination: contract.destination,
        hotel: contract.hotel,
        supplier: contract.supplier,
        organizer: contract.organizer,
        agency: contract.agency,
      });
    }

    revalidatePath("/admin/clients");
    revalidatePath("/admin/contratos");

    return { updatedAt: Date.now(), ok: true };
  } catch (error) {
    return {
      updatedAt: Date.now(),
      ok: false,
      error: (error as Error).message || "No se pudo actualizar.",
    };
  }
}
