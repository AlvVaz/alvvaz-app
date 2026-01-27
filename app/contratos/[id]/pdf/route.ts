import { NextResponse } from "next/server";

import { getContractById } from "@/lib/db";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  const resolvedParams = await Promise.resolve(params);
  const id = resolvedParams?.id;
  if (!id) {
    return NextResponse.json({ error: "Falta el id del contrato." }, { status: 400 });
  }

  const contract = await getContractById(id);
  if (!contract) {
    return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 });
  }

  const storagePath = contract.storagePath;
  const bucket =
    contract.storageBucket ||
    process.env.SUPABASE_STORAGE_BUCKET_CONTRACTS ||
    "contracts";

  if (!storagePath) {
    return NextResponse.json({ error: "PDF no generado aún." }, { status: 404 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(storagePath, 60 * 60 * 24 * 7);

  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { error: error?.message ?? "No se pudo abrir el PDF." },
      { status: 500 }
    );
  }

  return NextResponse.redirect(data.signedUrl, { status: 302 });
}
