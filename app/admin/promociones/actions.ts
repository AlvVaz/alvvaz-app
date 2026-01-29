"use server";

import { revalidatePath } from "next/cache";

import {
  createPromotion,
  deletePromotion,
  getPromotionById,
  updatePromotion,
} from "@/lib/db";

function parseOptionalText(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text ? text : null;
}

function parseRequiredText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function parseNumber(value: FormDataEntryValue | null, fallback = 0) {
  const raw = String(value ?? "").replace(/[^\d]/g, "");
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseLineList(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseTags(value: FormDataEntryValue | null) {
  const raw = String(value ?? "");
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((tag) => String(tag).trim()).filter(Boolean);
    }
  } catch {
    // ignore
  }
  return parseLineList(value);
}

export async function createPromotionAction(formData: FormData) {
  const title = parseRequiredText(formData.get("title"));
  const destinationCity = parseRequiredText(formData.get("destinationCity"));
  const destinationState = parseRequiredText(formData.get("destinationState"));
  const durationDays = parseNumber(formData.get("durationDays"), 0);
  const durationNights = parseOptionalText(formData.get("durationNights"));
  const durationNightsValue =
    durationNights !== null ? Number(durationNights) : null;
  const priceFrom = parseNumber(formData.get("priceFrom"), 0);
  const category = parseRequiredText(formData.get("category"));
  const budget = parseRequiredText(formData.get("budget"));
  const summary = parseRequiredText(formData.get("summary"));
  const description = parseOptionalText(formData.get("description"));
  const includes = parseLineList(formData.get("includes"));
  const excludes = parseLineList(formData.get("excludes"));
  const itinerary = parseLineList(formData.get("itinerary"));
  const activities = parseLineList(formData.get("activities"));
  const availableFrom = parseOptionalText(formData.get("availableFrom"));
  const availableTo = parseOptionalText(formData.get("availableTo"));
  const hotelName = parseOptionalText(formData.get("hotelName"));
  const hotelCategory = parseOptionalText(formData.get("hotelCategory"));
  const ctaLabel = parseOptionalText(formData.get("ctaLabel"));
  const ctaLink = parseOptionalText(formData.get("ctaLink"));
  const tags = parseTags(formData.get("tags"));
  const status = String(formData.get("status") ?? "draft").trim() as
    | "live"
    | "draft"
    | "paused";

  if (!title || !destinationCity || !destinationState || !category || !budget) {
    return;
  }

  await createPromotion({
    title,
    destinationCity,
    destinationState,
    durationDays,
    durationNights: Number.isFinite(durationNightsValue)
      ? durationNightsValue
      : null,
    priceFrom,
    category,
    budget,
    summary,
    description,
    includes,
    excludes,
    itinerary,
    activities,
    availableFrom,
    availableTo,
    hotelName,
    hotelCategory,
    ctaLabel,
    ctaLink,
    tags,
    status,
  });

  revalidatePath("/admin/promociones");
  revalidatePath("/promociones");
}

export async function updatePromotionAction(formData: FormData) {
  const id = parseRequiredText(formData.get("id"));
  if (!id) return;

  const title = parseRequiredText(formData.get("title"));
  const destinationCity = parseRequiredText(formData.get("destinationCity"));
  const destinationState = parseRequiredText(formData.get("destinationState"));
  const durationDays = parseNumber(formData.get("durationDays"), 0);
  const durationNights = parseOptionalText(formData.get("durationNights"));
  const durationNightsValue =
    durationNights !== null ? Number(durationNights) : null;
  const priceFrom = parseNumber(formData.get("priceFrom"), 0);
  const category = parseRequiredText(formData.get("category"));
  const budget = parseRequiredText(formData.get("budget"));
  const summary = parseRequiredText(formData.get("summary"));
  const description = parseOptionalText(formData.get("description"));
  const includes = parseLineList(formData.get("includes"));
  const excludes = parseLineList(formData.get("excludes"));
  const itinerary = parseLineList(formData.get("itinerary"));
  const activities = parseLineList(formData.get("activities"));
  const availableFrom = parseOptionalText(formData.get("availableFrom"));
  const availableTo = parseOptionalText(formData.get("availableTo"));
  const hotelName = parseOptionalText(formData.get("hotelName"));
  const hotelCategory = parseOptionalText(formData.get("hotelCategory"));
  const ctaLabel = parseOptionalText(formData.get("ctaLabel"));
  const ctaLink = parseOptionalText(formData.get("ctaLink"));
  const tags = parseTags(formData.get("tags"));
  const status = String(formData.get("status") ?? "draft").trim() as
    | "live"
    | "draft"
    | "paused";

  const updated = await updatePromotion(id, {
    title,
    destinationCity,
    destinationState,
    durationDays,
    durationNights: Number.isFinite(durationNightsValue)
      ? durationNightsValue
      : null,
    priceFrom,
    category,
    budget,
    summary,
    description,
    includes,
    excludes,
    itinerary,
    activities,
    availableFrom,
    availableTo,
    hotelName,
    hotelCategory,
    ctaLabel,
    ctaLink,
    tags,
    status,
  });

  if (updated) {
    revalidatePath("/admin/promociones");
    revalidatePath("/promociones");
    revalidatePath(`/promociones/${updated.slug}`);
  }
}

export async function deletePromotionAction(formData: FormData) {
  const id = parseRequiredText(formData.get("id"));
  if (!id) return;

  const existing = await getPromotionById(id);
  await deletePromotion(id);

  revalidatePath("/admin/promociones");
  revalidatePath("/promociones");
  if (existing?.slug) {
    revalidatePath(`/promociones/${existing.slug}`);
  }
}
