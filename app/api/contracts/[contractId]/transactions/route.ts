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

type PaymentInstallmentForTransaction = {
  id: string;
  amount: string | number;
  status: string;
  payment_plans:
    | {
        contract_id: string;
      }
    | {
        contract_id: string;
      }[]
    | null;
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

function getInstallmentPlan(row: PaymentInstallmentForTransaction) {
  return Array.isArray(row.payment_plans) ? row.payment_plans[0] : row.payment_plans;
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
  const paymentInstallmentId =
    String((body as Record<string, unknown>).paymentInstallmentId ?? "").trim() || null;

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
  let linkedInstallment: PaymentInstallmentForTransaction | null = null;

  if (paymentInstallmentId) {
    if (type !== "customer_payment") {
      return NextResponse.json(
        { error: "Solo los cobros al cliente pueden vincular una cuota." },
        { status: 400 }
      );
    }
    if (status !== "pagado") {
      return NextResponse.json(
        { error: "Para pagar una cuota, el movimiento debe estar en estado pagado." },
        { status: 400 }
      );
    }

    const { data: installment, error: installmentError } = await supabase
      .from("payment_installments")
      .select("id, amount, status, payment_plans!inner(contract_id)")
      .eq("id", paymentInstallmentId)
      .single();

    if (installmentError || !installment) {
      return NextResponse.json(
        { error: installmentError?.message || "Cuota no encontrada." },
        { status: 404 }
      );
    }

    linkedInstallment = installment as PaymentInstallmentForTransaction;
    if (getInstallmentPlan(linkedInstallment)?.contract_id !== contractId) {
      return NextResponse.json({ error: "La cuota no pertenece a este contrato." }, { status: 400 });
    }
    if (linkedInstallment.status !== "pendiente") {
      return NextResponse.json({ error: "Esta cuota ya fue pagada." }, { status: 400 });
    }
    if (Number(linkedInstallment.amount) !== amount) {
      return NextResponse.json(
        { error: "El monto del cobro debe coincidir con la cuota seleccionada." },
        { status: 400 }
      );
    }
  }

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

  if (linkedInstallment) {
    const { error: installmentUpdateError } = await supabase
      .from("payment_installments")
      .update({ status: "pagado", transaction_id: data.id })
      .eq("id", linkedInstallment.id)
      .eq("status", "pendiente")
      .select("id")
      .single();

    if (installmentUpdateError) {
      await supabase.from("contract_transactions").delete().eq("id", data.id);
      return NextResponse.json({ error: installmentUpdateError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ transaction: data }, { status: 201 });
}
