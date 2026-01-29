import { NextResponse } from "next/server";

import { createPromotionImage } from "@/lib/db";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  if (!payload) {
    return NextResponse.json({ ok: false, error: "Datos inválidos" }, { status: 400 });
  }

  const promotionId = String(payload.promotionId ?? "").trim();
  const storagePath = String(payload.storagePath ?? "").trim();

  if (!promotionId || !storagePath) {
    return NextResponse.json({ ok: false, error: "Datos incompletos" }, { status: 400 });
  }

  const bucket = process.env.SUPABASE_STORAGE_BUCKET_PROMOTIONS ?? "promotions";
  const supabase = getSupabaseAdmin();
  const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);
  const fileUrl = data.publicUrl;

  const image = await createPromotionImage({
    promotionId,
    fileUrl,
    storageBucket: bucket,
    storagePath,
  });

  return NextResponse.json({ ok: true, image });
}
