import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { getAdminFromCookies } from "@/lib/auth/admin";
import {
  getPaymentPlanByContractId,
  normalizeInstallmentCount,
  normalizePaymentPlanFrequency,
  normalizePlanAmount,
  normalizePlanDate,
  replacePaymentPlanForContract,
  clearContractPaymentPlanSummary,
  syncContractPaymentPlanSummary,
} from "@/lib/payment-plans";
import { prisma } from "@/lib/prisma";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

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

  const plan = await getPaymentPlanByContractId(contractId);
  return NextResponse.json({ plan });
}

export async function PUT(request: Request, context: RouteContext) {
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

  const payload = body as Record<string, unknown>;
  const frequency = normalizePaymentPlanFrequency(payload.frequency);
  if (!frequency) {
    return NextResponse.json({ error: "Tipo de plan invalido." }, { status: 400 });
  }

  const totalAmount = normalizePlanAmount(payload.totalAmount);
  const depositAmount = normalizePlanAmount(payload.depositAmount) ?? 0;
  const startDate = normalizePlanDate(payload.startDate);
  const endDate = normalizePlanDate(payload.endDate);
  const installmentCount = normalizeInstallmentCount(payload.installmentCount, frequency);
  const installmentsRaw = Array.isArray(payload.installments) ? payload.installments : null;

  if (totalAmount === null || totalAmount <= 0) {
    return NextResponse.json({ error: "El monto total es invalido." }, { status: 400 });
  }
  if (depositAmount > totalAmount) {
    return NextResponse.json({ error: "El deposito no puede ser mayor al total." }, { status: 400 });
  }
  if (!startDate || startDate === undefined) {
    return NextResponse.json({ error: "La fecha de inicio es invalida." }, { status: 400 });
  }
  if (!endDate || endDate === undefined) {
    return NextResponse.json({ error: "La fecha limite es invalida." }, { status: 400 });
  }
  if (startDate > endDate) {
    return NextResponse.json(
      { error: "La fecha de inicio no puede ser posterior a la fecha limite." },
      { status: 400 }
    );
  }
  if (installmentCount === null) {
    return NextResponse.json({ error: "El numero de pagos es invalido." }, { status: 400 });
  }

  const installments = installmentsRaw
    ? installmentsRaw.map((item) => {
        const installment = item as Record<string, unknown>;
        return {
          dueDate: normalizePlanDate(installment.dueDate),
          amount: normalizePlanAmount(installment.amount),
        };
      })
    : null;

  if (installments) {
    if (installments.length !== installmentCount) {
      return NextResponse.json(
        { error: "El numero de cuotas no coincide con el plan." },
        { status: 400 }
      );
    }
    if (installments.some((installment) => !installment.dueDate || installment.amount === null)) {
      return NextResponse.json({ error: "Hay cuotas invalidas." }, { status: 400 });
    }
    const balance = Number((totalAmount - depositAmount).toFixed(2));
    const installmentTotal = Number(
      installments.reduce((sum, installment) => sum + (installment.amount ?? 0), 0).toFixed(2)
    );
    if (installmentTotal !== balance) {
      return NextResponse.json(
        { error: "La suma de las cuotas debe coincidir con el balance." },
        { status: 400 }
      );
    }
  }

  try {
    const plan = await replacePaymentPlanForContract(contractId, {
      totalAmount,
      depositAmount,
      startDate,
      endDate,
      frequency,
      installmentCount,
      installments: installments
        ? installments.map((installment) => ({
            dueDate: installment.dueDate as string,
            amount: installment.amount as number,
          }))
        : undefined,
    });
    await syncContractPaymentPlanSummary(contractId, {
      totalAmount,
      depositAmount,
      startDate,
      endDate,
      frequency,
      installmentCount,
    });
    revalidatePath("/admin/contratos");
    revalidatePath("/admin/pagos");
    return NextResponse.json({ plan });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo guardar el plan." },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
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
  const { error } = await supabase
    .from("payment_plans")
    .delete()
    .eq("contract_id", contractId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await clearContractPaymentPlanSummary(contractId);
  revalidatePath("/admin/contratos");
  revalidatePath("/admin/pagos");

  return NextResponse.json({ ok: true });
}
