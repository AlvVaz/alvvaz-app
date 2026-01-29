"use server";

import { revalidatePath } from "next/cache";

import {
  createMagazineIssue,
  deleteMagazineIssue,
  getMagazineIssueById,
  updateMagazineIssue,
} from "@/lib/db";

export async function createIssueAction(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const publishedAtRaw = String(formData.get("publishedAt") ?? "").trim();

  if (!title) return;
  const publishedAt = publishedAtRaw ? new Date(publishedAtRaw).toISOString() : null;

  const issue = await createMagazineIssue({ title, description, publishedAt });
  revalidatePath("/admin/magazine");
  revalidatePath("/magazine");
  revalidatePath(`/magazine/${issue.slug}`);
}

export async function createIssueActionWithState(
  prevState: { submittedAt: number },
  formData: FormData
): Promise<{ submittedAt: number }> {
  await createIssueAction(formData);
  return { submittedAt: Date.now() };
}

export async function updateIssueAction(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const publishedAtRaw = String(formData.get("publishedAt") ?? "").trim();
  const publishedAt = publishedAtRaw ? new Date(publishedAtRaw).toISOString() : null;

  const existing = await getMagazineIssueById(id);
  const updated = await updateMagazineIssue(id, { title, description, publishedAt });
  revalidatePath("/admin/magazine");
  revalidatePath("/magazine");
  if (existing?.slug) {
    revalidatePath(`/magazine/${existing.slug}`);
  }
  if (updated?.slug) {
    revalidatePath(`/magazine/${updated.slug}`);
  }
}

export async function deleteIssueAction(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const existing = await getMagazineIssueById(id);
  await deleteMagazineIssue(id);
  revalidatePath("/admin/magazine");
  revalidatePath("/magazine");
  if (existing?.slug) {
    revalidatePath(`/magazine/${existing.slug}`);
  }
}
