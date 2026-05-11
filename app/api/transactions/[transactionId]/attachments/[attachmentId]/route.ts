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

export async function DELETE(_request: Request, context: RouteContext) {
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

  const { error: storageError } = await supabase.storage
    .from(TRANSACTION_RECEIPTS_BUCKET)
    .remove([attachment.storage_path]);

  if (storageError) {
    return NextResponse.json({ error: storageError.message }, { status: 500 });
  }

  const { error: deleteError } = await supabase
    .from("transaction_attachments")
    .delete()
    .eq("id", attachmentId)
    .eq("transaction_id", transactionId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
