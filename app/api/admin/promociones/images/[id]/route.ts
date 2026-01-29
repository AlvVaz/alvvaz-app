import { NextResponse } from "next/server";

import { deletePromotionImage } from "@/lib/db";
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

  const image = await deletePromotionImage(id);
  if (!image) {
    return NextResponse.json({ ok: false, error: "No existe" }, { status: 404 });
  }

  if (image.storagePath) {
    const bucket = image.storageBucket ?? "promotions";
    const supabase = getSupabaseAdmin();
    await supabase.storage.from(bucket).remove([image.storagePath]);
  }

  return NextResponse.json({ ok: true });
}
