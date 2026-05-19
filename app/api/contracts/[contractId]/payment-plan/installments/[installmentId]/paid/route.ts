import { NextResponse } from "next/server";

import { getAdminFromCookies } from "@/lib/auth/admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ contractId: string; installmentId: string }>;
};

async function resolveParams(context: RouteContext) {
  const params = await context.params;
  return {
    contractId: String(params.contractId ?? "").trim(),
    installmentId: String(params.installmentId ?? "").trim(),
  };
}

async function requireAdmin() {
  const admin = await getAdminFromCookies();
  return admin ? null : NextResponse.json({ error: "Sesion no valida." }, { status: 401 });
}

function toDateOnly(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

type ExistingTransactionRow = {
  id: string;
  concept: string;
};

function normalizeConcept(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function PATCH(_request: Request, context: RouteContext) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const { contractId, installmentId } = await resolveParams(context);
  if (!contractId || !installmentId) {
    return NextResponse.json({ error: "Faltan datos del pago." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: installment, error: installmentError } = await supabase
    .from("payment_installments")
    .select("id, plan_id, installment_number, due_date, amount, status, transaction_id, payment_plans!inner(contract_id)")
    .eq("id", installmentId)
    .eq("payment_plans.contract_id", contractId)
    .single();

  if (installmentError || !installment) {
    return NextResponse.json(
      { error: installmentError?.message || "Pago no encontrado." },
      { status: 404 }
    );
  }

  if (installment.status === "pagado") {
    return NextResponse.json({ ok: true });
  }

  const { data: linkedInstallments, error: linkedInstallmentsError } = await supabase
    .from("payment_installments")
    .select("transaction_id")
    .eq("plan_id", installment.plan_id)
    .not("transaction_id", "is", null);

  if (linkedInstallmentsError) {
    return NextResponse.json({ error: linkedInstallmentsError.message }, { status: 500 });
  }

  const linkedTransactionIds = new Set(
    (linkedInstallments ?? [])
      .map((row) => String(row.transaction_id ?? "").trim())
      .filter(Boolean)
  );

  const { data: existingTransactions, error: existingTransactionError } = await supabase
    .from("contract_transactions")
    .select("id, concept")
    .eq("contract_id", contractId)
    .eq("type", "customer_payment")
    .eq("status", "pagado")
    .eq("amount", installment.amount)
    .order("date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (existingTransactionError) {
    return NextResponse.json({ error: existingTransactionError.message }, { status: 500 });
  }

  const reusableTransactions = ((existingTransactions ?? []) as ExistingTransactionRow[]).filter(
    (transaction) => !linkedTransactionIds.has(transaction.id)
  );
  const expectedConcept = normalizeConcept(`Pago #${installment.installment_number}`);
  const reusableTransaction =
    reusableTransactions.find((transaction) => normalizeConcept(transaction.concept) === expectedConcept) ??
    reusableTransactions[0];

  if (reusableTransaction) {
    const { error: linkError } = await supabase
      .from("payment_installments")
      .update({ status: "pagado", transaction_id: reusableTransaction.id })
      .eq("id", installmentId)
      .eq("status", "pendiente");

    if (linkError) {
      return NextResponse.json({ error: linkError.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      transactionId: reusableTransaction.id,
      reusedExistingTransaction: true,
    });
  }

  const { data: transaction, error: transactionError } = await supabase
    .from("contract_transactions")
    .insert({
      contract_id: contractId,
      type: "customer_payment",
      concept: `Pago #${installment.installment_number}`,
      amount: installment.amount,
      date: toDateOnly(new Date()),
      status: "pagado",
      notes: `Generado desde plan de pagos. Fecha esperada: ${installment.due_date}.`,
    })
    .select("id")
    .single();

  if (transactionError || !transaction) {
    return NextResponse.json(
      { error: transactionError?.message || "No se pudo registrar el pago." },
      { status: 500 }
    );
  }

  const { error: updateError } = await supabase
    .from("payment_installments")
    .update({ status: "pagado", transaction_id: transaction.id })
    .eq("id", installmentId);

  if (updateError) {
    await supabase.from("contract_transactions").delete().eq("id", transaction.id);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, transactionId: transaction.id });
}
