"use server";

import { revalidatePath } from "next/cache";

import { createTrip, deleteTrip, updateTrip } from "@/lib/db";
import type { TripTraveler } from "@/lib/db";

function parseTravelers(raw: string): TripTraveler[] {
  try {
    const parsed = JSON.parse(raw) as TripTraveler[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export async function createTripAction(formData: FormData) {
  const clientName = String(formData.get("clientName") ?? "").trim();
  const destination = String(formData.get("destination") ?? "").trim();
  const hotel = String(formData.get("hotel") ?? "").trim();
  const supplier = String(formData.get("supplier") ?? "").trim();
  const organizer = String(formData.get("organizer") ?? "").trim();
  const departureDate = String(formData.get("departureDate") ?? "").trim();
  const returnDate = String(formData.get("returnDate") ?? "").trim();
  const travelersRaw = String(formData.get("travelers") ?? "[]");
  const passengerCountRaw = String(formData.get("passengerCount") ?? "").trim();
  const passengerCount = Number(passengerCountRaw);

  if (!destination) return;

  const travelers = parseTravelers(travelersRaw);

  await createTrip({
    clientName,
    destination,
    hotel,
    supplier,
    organizer,
    departureDate: departureDate || null,
    returnDate: returnDate || null,
    passengerCount: Number.isFinite(passengerCount) ? passengerCount : travelers.length,
    travelers,
  });

  // TODO: Trigger WhatsApp reminders + CRM updates for upcoming trips.
  revalidatePath("/admin/viajes");
}

export async function updateTripAction(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const clientName = String(formData.get("clientName") ?? "").trim();
  const destination = String(formData.get("destination") ?? "").trim();
  const hotel = String(formData.get("hotel") ?? "").trim();
  const supplier = String(formData.get("supplier") ?? "").trim();
  const organizer = String(formData.get("organizer") ?? "").trim();
  const departureDate = String(formData.get("departureDate") ?? "").trim();
  const returnDate = String(formData.get("returnDate") ?? "").trim();
  const travelersRaw = String(formData.get("travelers") ?? "[]");
  const passengerCountRaw = String(formData.get("passengerCount") ?? "").trim();
  const passengerCount = Number(passengerCountRaw);
  const travelers = parseTravelers(travelersRaw);

  await updateTrip(id, {
    clientName,
    destination,
    hotel,
    supplier,
    organizer,
    departureDate: departureDate || null,
    returnDate: returnDate || null,
    passengerCount: Number.isFinite(passengerCount) ? passengerCount : travelers.length,
    travelers,
  });

  revalidatePath("/admin/viajes");
}

export async function deleteTripAction(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  await deleteTrip(id);
  revalidatePath("/admin/viajes");
}
