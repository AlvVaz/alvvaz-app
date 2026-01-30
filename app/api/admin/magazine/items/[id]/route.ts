import { NextResponse } from "next/server";

import { deleteMagazineItem, getMagazineItemById } from "@/lib/db";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolved = await params;
  const id = String(resolved?.id ?? "").trim();
  if (!id) {
    return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });
  }

  const item = await getMagazineItemById(id);
  if (!item) {
    return NextResponse.json({ ok: false, error: "No existe" }, { status: 404 });
  }

  await deleteMagazineItem(id);

  const metadata = item.metadata ?? {};
  const storagePath = typeof metadata.storagePath === "string" ? metadata.storagePath : "";
  const bucket =
    (typeof metadata.bucket === "string" && metadata.bucket) ||
    process.env.SUPABASE_STORAGE_BUCKET ||
    "magazine";

  if (storagePath) {
    const supabase = getSupabaseAdmin();
    await supabase.storage.from(bucket).remove([storagePath]);
  }

  return NextResponse.json({ ok: true });
}
