"use server";

import { revalidatePath, revalidateTag } from "next/cache";

import {
  ADMIN_COMMISSIONS_CACHE_TAG,
  ADMIN_TRIPS_CACHE_TAG,
} from "@/lib/admin-cache-tags";
import {
  createTrip,
  deleteTrip,
  deleteTripsByIds,
  updateTrip,
  syncClientsFromTravelers,
} from "@/lib/db";
import type { TripTraveler } from "@/lib/db";

const EXPIRE_ADMIN_CACHE = { expire: 0 };

function parseTravelers(raw: string): TripTraveler[] {
  try {
    const parsed = JSON.parse(raw) as TripTraveler[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function revalidateTripsAdminData() {
  revalidateTag(ADMIN_TRIPS_CACHE_TAG, EXPIRE_ADMIN_CACHE);
  revalidateTag(ADMIN_COMMISSIONS_CACHE_TAG, EXPIRE_ADMIN_CACHE);
  revalidatePath("/admin/viajes");
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

  const travelersForSync =
    travelers.length > 0
      ? travelers
      : clientName
      ? [{ name: clientName, phone: "", contract: "" }]
      : [];

  await syncClientsFromTravelers(travelersForSync, {
    source: "trip",
    destination,
    hotel,
    supplier,
    organizer,
  });

  // TODO: Trigger WhatsApp reminders + CRM updates for upcoming trips.
  revalidateTripsAdminData();
  revalidatePath("/admin/clients");
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

  revalidateTripsAdminData();
  const travelersForSync =
    travelers.length > 0
      ? travelers
      : clientName
      ? [{ name: clientName, phone: "", contract: "" }]
      : [];

  await syncClientsFromTravelers(travelersForSync, {
    source: "trip",
    destination,
    hotel,
    supplier,
    organizer,
  });
  revalidatePath("/admin/clients");
}

export async function updateTripStageAction(id: string, stage: number): Promise<void> {
  const tripId = String(id ?? "").trim();
  if (!tripId) return;
  const rawStage = Number(stage);
  const safeStage = Number.isFinite(rawStage)
    ? Math.max(0, Math.min(3, Math.round(rawStage)))
    : 0;

  await updateTrip(tripId, { prepStage: safeStage });
  revalidateTripsAdminData();
}

export async function deleteTripAction(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  await deleteTrip(id);
  revalidateTripsAdminData();
}

export async function bulkDeleteTripsAction(ids: string[]) {
  if (!ids.length) {
    return { ok: false, error: "Selecciona al menos un viaje." };
  }
  await deleteTripsByIds(ids);
  revalidateTripsAdminData();
  return { ok: true };
}
