import { NextResponse } from "next/server";

import { createMagazineItem } from "@/lib/db";

type ItemPayload = {
  issueId: string;
  title: string;
  kind: "PDF" | "IMAGE";
  fileUrl: string;
  metadata?: Record<string, unknown>;
};

export const runtime = "nodejs";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);

  if (!payload) {
    return NextResponse.json({ ok: false, error: "Datos inválidos" }, { status: 400 });
  }

  const items: ItemPayload[] = Array.isArray(payload) ? payload : [payload];

  try {
    for (const item of items) {
      if (!item.issueId || !item.fileUrl || !item.kind) {
        return NextResponse.json(
          { ok: false, error: "Datos incompletos" },
          { status: 400 }
        );
      }

      await createMagazineItem({
        issueId: item.issueId,
        title: item.title || "Archivo",
        kind: item.kind,
        fileUrl: item.fileUrl,
        metadata: item.metadata ?? {},
      });
    }
  } catch (error) {
    return NextResponse.json({ ok: false, error: "Issue no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
