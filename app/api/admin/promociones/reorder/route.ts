import { NextResponse } from "next/server";

import { reorderPromotions } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  if (!payload) {
    return NextResponse.json({ ok: false, error: "Datos inválidos" }, { status: 400 });
  }

  const updates = Array.isArray(payload.updates) ? payload.updates : [];
  if (updates.length === 0) {
    return NextResponse.json({ ok: true });
  }

  const sanitized = updates
    .map((item: { id?: string; sortOrder?: number }) => ({
      id: String(item.id ?? "").trim(),
      sortOrder: Number(item.sortOrder ?? 0),
    }))
    .filter(
      (item: { id: string; sortOrder: number }) =>
        item.id && Number.isFinite(item.sortOrder)
    );

  await reorderPromotions(sanitized);

  return NextResponse.json({ ok: true });
}
