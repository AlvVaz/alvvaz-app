import { NextResponse } from "next/server";

import { getAdminFromCookies } from "@/lib/auth/admin";
import { getPaymentPlanByContractId } from "@/lib/payment-plans";
import { prisma } from "@/lib/prisma";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { groupTransactions, type TransactionRow } from "@/lib/transactions";

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
  const [transactionsResult, plan] = await Promise.all([
    supabase
      .from("contract_transactions")
      .select("*, transaction_attachments(*)")
      .eq("contract_id", contractId)
      .order("date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true }),
    getPaymentPlanByContractId(contractId),
  ]);

  if (transactionsResult.error) {
    return NextResponse.json({ error: transactionsResult.error.message }, { status: 500 });
  }

  return NextResponse.json({
    transactions: groupTransactions((transactionsResult.data ?? []) as TransactionRow[]),
    plan,
  });
}
