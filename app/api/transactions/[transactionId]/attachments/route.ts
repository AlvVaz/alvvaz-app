import { NextResponse } from "next/server";

import { getAdminFromCookies } from "@/lib/auth/admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { TRANSACTION_RECEIPTS_BUCKET, sanitizeFileName } from "@/lib/transactions";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ transactionId: string }>;
};

async function resolveTransactionId(context: RouteContext) {
  const params = await context.params;
  return String(params.transactionId ?? "").trim();
}

export async function POST(request: Request, context: RouteContext) {
  const admin = await getAdminFromCookies();
  if (!admin) {
    return NextResponse.json({ error: "Sesion no valida." }, { status: 401 });
  }

  const transactionId = await resolveTransactionId(context);
  if (!transactionId) {
    return NextResponse.json({ error: "Falta el id de la transaccion." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: transaction, error: transactionError } = await supabase
    .from("contract_transactions")
    .select("id, contract_id")
    .eq("id", transactionId)
    .single();

  if (transactionError || !transaction) {
    return NextResponse.json(
      { error: transactionError?.message || "Transaccion no encontrada." },
      { status: 404 }
    );
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Archivo invalido." }, { status: 400 });
  }

  const safeName = sanitizeFileName(file.name || "comprobante");
  if (!safeName) {
    return NextResponse.json({ error: "Nombre de archivo invalido." }, { status: 400 });
  }

  const storagePath = `${transaction.contract_id}/${transactionId}/${Date.now()}-${safeName}`;
  const buffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from(TRANSACTION_RECEIPTS_BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: attachment, error: insertError } = await supabase
    .from("transaction_attachments")
    .insert({
      transaction_id: transactionId,
      storage_path: storagePath,
      file_name: safeName,
      mime_type: file.type || null,
      size: file.size,
    })
    .select("*")
    .single();

  if (insertError) {
    await supabase.storage.from(TRANSACTION_RECEIPTS_BUCKET).remove([storagePath]);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ attachment }, { status: 201 });
}
