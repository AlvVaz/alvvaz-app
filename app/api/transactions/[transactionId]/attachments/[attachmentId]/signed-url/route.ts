import { NextResponse } from "next/server";

import { getAdminFromCookies } from "@/lib/auth/admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { TRANSACTION_RECEIPTS_BUCKET } from "@/lib/transactions";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ transactionId: string; attachmentId: string }>;
};

async function resolveParams(context: RouteContext) {
  const params = await context.params;
  return {
    transactionId: String(params.transactionId ?? "").trim(),
    attachmentId: String(params.attachmentId ?? "").trim(),
  };
}

export async function GET(_request: Request, context: RouteContext) {
  const admin = await getAdminFromCookies();
  if (!admin) {
    return NextResponse.json({ error: "Sesion no valida." }, { status: 401 });
  }

  const { transactionId, attachmentId } = await resolveParams(context);
  if (!transactionId || !attachmentId) {
    return NextResponse.json({ error: "Faltan datos del comprobante." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: attachment, error: findError } = await supabase
    .from("transaction_attachments")
    .select("id, storage_path")
    .eq("id", attachmentId)
    .eq("transaction_id", transactionId)
    .single();

  if (findError || !attachment) {
    return NextResponse.json(
      { error: findError?.message || "Comprobante no encontrado." },
      { status: 404 }
    );
  }

  const { data, error } = await supabase.storage
    .from(TRANSACTION_RECEIPTS_BUCKET)
    .createSignedUrl(attachment.storage_path, 60);

  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { error: error?.message || "No se pudo generar la URL." },
      { status: 500 }
    );
  }

  return NextResponse.json({ signedUrl: data.signedUrl, expiresIn: 60 });
}
