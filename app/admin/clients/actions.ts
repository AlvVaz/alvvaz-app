"use server";

import { revalidatePath } from "next/cache";

import {
  createClient,
  deleteClient,
  deleteClientsByIds,
  parseTags,
  updateClient,
} from "@/lib/db";

export async function createClientAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const contact = String(formData.get("contact") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const tags = parseTags(String(formData.get("tags") ?? ""));
  const notes = String(formData.get("notes") ?? "").trim();

  if (!name) {
    return;
  }

  await createClient({ name, contact, status, tags, notes });
  // TODO: Trigger WhatsApp onboarding + CRM workflow once integrations are ready.
  revalidatePath("/admin/clients");
}

export async function updateClientAction(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const name = String(formData.get("name") ?? "").trim();
  const contact = String(formData.get("contact") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const tags = parseTags(String(formData.get("tags") ?? ""));
  const notes = String(formData.get("notes") ?? "").trim();

  await updateClient(id, { name, contact, status, tags, notes });
  revalidatePath("/admin/clients");
}

export async function deleteClientAction(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await deleteClient(id);
  revalidatePath("/admin/clients");
}

export async function bulkDeleteClientsAction(ids: string[]) {
  if (!ids.length) {
    return { ok: false, error: "Selecciona al menos un cliente." };
  }
  await deleteClientsByIds(ids);
  revalidatePath("/admin/clients");
  return { ok: true };
}
