import { NextResponse } from "next/server";

import { getAdminFromCookies } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  groupTransactions,
  normalizeAmount,
  normalizeOptionalDate,
  normalizeTransactionStatus,
  normalizeTransactionType,
  type TransactionRow,
} from "@/lib/transactions";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ contractId: string }>;
};

async function resolveContractId(context: RouteContext) {
  const params = await context.params;
  return String(params.contractId ?? "").trim();
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

export async function GET(_request: Request, context: RouteContext) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const contractId = await resolveContractId(context);
  if (!contractId) {
    return NextResponse.json({ error: "Falta el id del contrato." }, { status: 400 });
  }

  if (!(await contractExists(contractId))) {
    return NextResponse.json({ error: "Contrato no encontrado." }, { status: 404 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("contract_transactions")
    .select("*, transaction_attachments(*)")
    .eq("contract_id", contractId)
    .order("date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ transactions: groupTransactions((data ?? []) as TransactionRow[]) });
}

export async function POST(request: Request, context: RouteContext) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const contractId = await resolveContractId(context);
  if (!contractId) {
    return NextResponse.json({ error: "Falta el id del contrato." }, { status: 400 });
  }

  if (!(await contractExists(contractId))) {
    return NextResponse.json({ error: "Contrato no encontrado." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Datos invalidos." }, { status: 400 });
  }

  const type = normalizeTransactionType((body as Record<string, unknown>).type);
  const concept = String((body as Record<string, unknown>).concept ?? "").trim();
  const amount = normalizeAmount((body as Record<string, unknown>).amount);
  const date = normalizeOptionalDate((body as Record<string, unknown>).date);
  const status = normalizeTransactionStatus((body as Record<string, unknown>).status) ?? "pendiente";
  const notes = String((body as Record<string, unknown>).notes ?? "").trim() || null;

  if (!type) {
    return NextResponse.json({ error: "Tipo de transaccion invalido." }, { status: 400 });
  }
  if (!concept) {
    return NextResponse.json({ error: "El concepto es obligatorio." }, { status: 400 });
  }
  if (amount === null) {
    return NextResponse.json({ error: "El monto es invalido." }, { status: 400 });
  }
  if (date === undefined) {
    return NextResponse.json({ error: "La fecha es invalida." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("contract_transactions")
    .insert({
      contract_id: contractId,
      type,
      concept,
      amount,
      date,
      status,
      notes,
    })
    .select("*, transaction_attachments(*)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ transaction: data }, { status: 201 });
}
