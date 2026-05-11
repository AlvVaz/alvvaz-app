import { NextResponse } from "next/server";

import { getAdminFromCookies } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  TRANSACTION_RECEIPTS_BUCKET,
  normalizeAmount,
  normalizeOptionalDate,
  normalizeTransactionStatus,
} from "@/lib/transactions";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ contractId: string; transactionId: string }>;
};

async function resolveParams(context: RouteContext) {
  const params = await context.params;
  return {
    contractId: String(params.contractId ?? "").trim(),
    transactionId: String(params.transactionId ?? "").trim(),
  };
}

async function requireAdmin() {
  const admin = await getAdminFromCookies();
  return admin ? null : NextResponse.json({ error: "Sesion no valida." }, { status: 401 });
}

async function contractExists(contractId: string) {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    select: { id: true },
  });
  return Boolean(contract);
}

export async function PATCH(request: Request, context: RouteContext) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const { contractId, transactionId } = await resolveParams(context);
  if (!contractId || !transactionId) {
    return NextResponse.json({ error: "Faltan datos de la transaccion." }, { status: 400 });
  }

  if (!(await contractExists(contractId))) {
    return NextResponse.json({ error: "Contrato no encontrado." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Datos invalidos." }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const concept = String(payload.concept ?? "").trim();
  const amount = normalizeAmount(payload.amount);
  const date = normalizeOptionalDate(payload.date);
  const status = normalizeTransactionStatus(payload.status);
  const notes = String(payload.notes ?? "").trim() || null;

  if (!concept) {
    return NextResponse.json({ error: "El concepto es obligatorio." }, { status: 400 });
  }
  if (amount === null) {
    return NextResponse.json({ error: "El monto es invalido." }, { status: 400 });
  }
  if (date === undefined) {
    return NextResponse.json({ error: "La fecha es invalida." }, { status: 400 });
  }
  if (!status) {
    return NextResponse.json({ error: "El estado es invalido." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("contract_transactions")
    .update({ concept, amount, date, status, notes })
    .eq("id", transactionId)
    .eq("contract_id", contractId)
    .select("*, transaction_attachments(*)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ transaction: data });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const { contractId, transactionId } = await resolveParams(context);
  if (!contractId || !transactionId) {
    return NextResponse.json({ error: "Faltan datos de la transaccion." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: transaction, error: transactionError } = await supabase
    .from("contract_transactions")
    .select("id")
    .eq("id", transactionId)
    .eq("contract_id", contractId)
    .single();

  if (transactionError || !transaction) {
    return NextResponse.json(
      { error: transactionError?.message || "Transaccion no encontrada." },
      { status: 404 }
    );
  }

  const { data: attachments, error: attachmentsError } = await supabase
    .from("transaction_attachments")
    .select("storage_path")
    .eq("transaction_id", transactionId);

  if (attachmentsError) {
    return NextResponse.json({ error: attachmentsError.message }, { status: 500 });
  }

  const paths = (attachments ?? [])
    .map((attachment) => String(attachment.storage_path ?? "").trim())
    .filter(Boolean);

  if (paths.length > 0) {
    const { error: storageError } = await supabase.storage
      .from(TRANSACTION_RECEIPTS_BUCKET)
      .remove(paths);

    if (storageError) {
      return NextResponse.json({ error: storageError.message }, { status: 500 });
    }
  }

  const { error } = await supabase
    .from("contract_transactions")
    .delete()
    .eq("id", transactionId)
    .eq("contract_id", contractId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
