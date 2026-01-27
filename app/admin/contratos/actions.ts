"use server";

import { revalidatePath } from "next/cache";

import {
  createTrip,
  createContract,
  deleteContract,
  updateContract,
  type TripTraveler,
} from "@/lib/db";
import type { ContractStatus } from "@/lib/db";

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
  prevState: { submittedAt: number },
  formData: FormData
): Promise<{ submittedAt: number }> {
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
  const totalPrice = String(formData.get("totalPrice") ?? "").trim();
  const firstPayment = String(formData.get("firstPayment") ?? "").trim();
  const balanceDue = String(formData.get("balanceDue") ?? "").trim();
  const liquidationDate = String(formData.get("liquidationDate") ?? "").trim();
  const statusRaw = String(formData.get("status") ?? "pending").trim();
  const status: ContractStatus =
    statusRaw === "signed" || statusRaw === "paid" ? statusRaw : "pending";
  const isSigned = status === "signed" || status === "paid";
  const isPaid = status === "paid";

  if (!title || !clientName || !destination) return prevState;

  const travelers = parseTravelers(travelersRaw);

  const contract = await createContract({
    title,
    contractNumber: contractNumber || null,
    reservationDate: reservationDate || null,
    seller: seller || null,
    agency: agency || null,
    clientName,
    destination,
    hotel: hotel || null,
    supplier: supplier || null,
    organizer: organizer || null,
    passengerCount: Number.isFinite(passengerCount) ? passengerCount : travelers.length || null,
    departureDate: departureDate || null,
    returnDate: returnDate || null,
    travelers,
    description: description || null,
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
  });

  const trip = await createTrip({
    clientName,
    destination,
    hotel: hotel || undefined,
    supplier: supplier || undefined,
    organizer: organizer || undefined,
    passengerCount: Number.isFinite(passengerCount) ? passengerCount : travelers.length || 0,
    departureDate: departureDate || null,
    returnDate: returnDate || null,
    travelers,
  });

  await updateContract(contract.id, { tripId: trip.id });

  // TODO: Generate PDF from template and upload to storage.
  revalidatePath("/admin/contratos");
  revalidatePath("/admin/viajes");
  return { submittedAt: Date.now() };
}

export async function updateContractAction(
  prevState: { submittedAt: number },
  formData: FormData
): Promise<{ submittedAt: number }> {
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
  const totalPrice = String(formData.get("totalPrice") ?? "").trim();
  const firstPayment = String(formData.get("firstPayment") ?? "").trim();
  const balanceDue = String(formData.get("balanceDue") ?? "").trim();
  const liquidationDate = String(formData.get("liquidationDate") ?? "").trim();
  const statusRaw = String(formData.get("status") ?? "pending").trim();
  const status: ContractStatus =
    statusRaw === "signed" || statusRaw === "paid" ? statusRaw : "pending";
  const isSigned = status === "signed" || status === "paid";
  const isPaid = status === "paid";

  const travelers = parseTravelers(travelersRaw);

  const updated = await updateContract(id, {
    title,
    contractNumber: contractNumber || null,
    reservationDate: reservationDate || null,
    seller: seller || null,
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
    totalPrice: totalPrice || null,
    firstPayment: firstPayment || null,
    balanceDue: balanceDue || null,
    liquidationDate: liquidationDate || null,
    status,
    isSigned,
    isPaid,
  });

  if (updated && updated.status === "paid" && !updated.tripId) {
    // TODO: Auto-generate a trip once the contract is approved.
  }

  revalidatePath("/admin/contratos");
  return prevState;
}

export async function deleteContractAction(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  await deleteContract(id);
  revalidatePath("/admin/contratos");
}
