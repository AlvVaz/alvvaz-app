import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type PaymentPlanFrequency = "contado" | "semanal" | "quincenal" | "mensual";
export type PaymentInstallmentStatus = "pendiente" | "pagado";
export type RuntimeInstallmentStatus = PaymentInstallmentStatus | "vencido";

export type PaymentInstallment = {
  id: string;
  planId: string;
  installmentNumber: number;
  dueDate: string;
  amount: string;
  status: PaymentInstallmentStatus;
  transactionId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type PaymentPlan = {
  id: string;
  contractId: string;
  totalAmount: string;
  depositAmount: string;
  startDate: string;
  endDate: string;
  frequency: PaymentPlanFrequency;
  installmentCount: number;
  createdAt: string | null;
  updatedAt: string | null;
  installments: PaymentInstallment[];
};

export type PaymentPlanInput = {
  totalAmount: number;
  depositAmount: number;
  startDate: string;
  endDate: string;
  frequency: PaymentPlanFrequency;
  installmentCount: number;
};

type PaymentPlanRow = {
  id: string;
  contract_id: string;
  total_amount: string | number;
  deposit_amount: string | number;
  start_date: string;
  end_date: string;
  frequency: PaymentPlanFrequency;
  installment_count: number;
  created_at: string | null;
  updated_at: string | null;
  payment_installments?: PaymentInstallmentRow[] | null;
};

type PaymentInstallmentRow = {
  id: string;
  plan_id: string;
  installment_number: number;
  due_date: string;
  amount: string | number;
  status: PaymentInstallmentStatus;
  transaction_id: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export const paymentPlanFrequencies: PaymentPlanFrequency[] = [
  "contado",
  "semanal",
  "quincenal",
  "mensual",
];

export function normalizePaymentPlanFrequency(value: unknown): PaymentPlanFrequency | null {
  const frequency = String(value ?? "").trim().toLowerCase();
  return paymentPlanFrequencies.includes(frequency as PaymentPlanFrequency)
    ? (frequency as PaymentPlanFrequency)
    : null;
}

export function normalizePlanAmount(value: unknown) {
  const cleaned = String(value ?? "").replace(/[^\d.-]/g, "");
  const number = Number(cleaned);
  if (!Number.isFinite(number) || number < 0) return null;
  return Number(number.toFixed(2));
}

export function normalizeInstallmentCount(value: unknown, frequency: PaymentPlanFrequency) {
  if (frequency === "contado") return 1;
  const count = Number(value);
  if (!Number.isInteger(count) || count < 1 || count > 120) return null;
  return count;
}

export function normalizePlanDate(value: unknown) {
  const date = String(value ?? "").trim();
  if (!date) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined;
}

function toCurrencyString(value: string | number) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(2) : String(value);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  const day = next.getDate();
  next.setMonth(next.getMonth() + months);
  if (next.getDate() !== day) {
    next.setDate(0);
  }
  return next;
}

function toDateOnly(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateOnly(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function buildPaymentScheduleDates(input: {
  startDate: string;
  endDate: string;
  frequency: PaymentPlanFrequency;
  installmentCount?: number | null;
}) {
  const startDate = parseDateOnly(input.startDate);
  const endDate = parseDateOnly(input.endDate);
  if (!startDate || !endDate) return [];

  if (input.frequency === "contado" || startDate >= endDate) {
    return [toDateOnly(endDate)];
  }

  const dates: string[] = [];
  let current = startDate;

  while (current < endDate && dates.length < 119) {
    dates.push(toDateOnly(current));
    const next =
      input.frequency === "mensual"
        ? addMonths(current, 1)
        : addDays(current, input.frequency === "quincenal" ? 14 : 7);

    if (next <= current) break;
    current = next;
  }

  const endDateOnly = toDateOnly(endDate);
  if (dates[dates.length - 1] !== endDateOnly) {
    dates.push(endDateOnly);
  }

  const desiredCount = input.installmentCount ?? dates.length;
  const count = Math.min(Math.max(desiredCount, 1), dates.length);
  if (count >= dates.length) return dates;
  if (count === 1) return [endDateOnly];
  return [...dates.slice(0, count - 1), endDateOnly];
}

export function calculateInstallmentDrafts(input: PaymentPlanInput) {
  const balance = Math.max(input.totalAmount - input.depositAmount, 0);
  const dates = buildPaymentScheduleDates(input);
  const count = dates.length;
  if (count < 1) return [];

  const baseAmount = Math.floor((balance / count) * 100) / 100;
  const totalBase = baseAmount * count;
  const remainder = Number((balance - totalBase).toFixed(2));

  return dates.map((dueDate, index) => {
    return {
      installment_number: index + 1,
      due_date: dueDate,
      amount: Number((baseAmount + (index === count - 1 ? remainder : 0)).toFixed(2)),
      status: "pendiente" as PaymentInstallmentStatus,
    };
  });
}

export function mapPaymentInstallment(row: PaymentInstallmentRow): PaymentInstallment {
  return {
    id: row.id,
    planId: row.plan_id,
    installmentNumber: row.installment_number,
    dueDate: row.due_date,
    amount: toCurrencyString(row.amount),
    status: row.status,
    transactionId: row.transaction_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapPaymentPlan(row: PaymentPlanRow): PaymentPlan {
  return {
    id: row.id,
    contractId: row.contract_id,
    totalAmount: toCurrencyString(row.total_amount),
    depositAmount: toCurrencyString(row.deposit_amount),
    startDate: row.start_date,
    endDate: row.end_date,
    frequency: row.frequency,
    installmentCount: row.installment_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    installments: Array.isArray(row.payment_installments)
      ? row.payment_installments
          .map(mapPaymentInstallment)
          .sort((a, b) => a.installmentNumber - b.installmentNumber)
      : [],
  };
}

export async function getPaymentPlansByContractIds(contractIds: string[]) {
  if (contractIds.length === 0) return new Map<string, PaymentPlan>();

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("payment_plans")
    .select("*, payment_installments(*)")
    .in("contract_id", contractIds)
    .order("installment_number", {
      referencedTable: "payment_installments",
      ascending: true,
    });

  if (error) {
    console.error("No se pudieron cargar planes de pago:", error.message);
    return new Map<string, PaymentPlan>();
  }

  const grouped = new Map<string, PaymentPlan>();
  ((data ?? []) as PaymentPlanRow[]).map(mapPaymentPlan).forEach((plan) => {
    grouped.set(plan.contractId, plan);
  });
  return grouped;
}

export async function getPaymentPlanByContractId(contractId: string) {
  const plans = await getPaymentPlansByContractIds([contractId]);
  return plans.get(contractId) ?? null;
}

export async function replacePaymentPlanForContract(contractId: string, input: PaymentPlanInput) {
  const supabase = getSupabaseAdmin();
  const installments = calculateInstallmentDrafts(input);

  const { data: existingPlan, error: existingError } = await supabase
    .from("payment_plans")
    .select("id")
    .eq("contract_id", contractId)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existingPlan?.id) {
    const { error: deleteError } = await supabase
      .from("payment_plans")
      .delete()
      .eq("id", existingPlan.id);

    if (deleteError) {
      throw new Error(deleteError.message);
    }
  }

  const { data: plan, error: planError } = await supabase
    .from("payment_plans")
    .insert({
      contract_id: contractId,
      total_amount: input.totalAmount,
      deposit_amount: input.depositAmount,
      start_date: input.startDate,
      end_date: input.endDate,
      frequency: input.frequency,
      installment_count: installments.length,
    })
    .select("*")
    .single();

  if (planError || !plan) {
    throw new Error(planError?.message || "No se pudo crear el plan de pagos.");
  }

  if (installments.length > 0) {
    const { error: installmentsError } = await supabase
      .from("payment_installments")
      .insert(installments.map((installment) => ({ ...installment, plan_id: plan.id })));

    if (installmentsError) {
      throw new Error(installmentsError.message);
    }
  }

  return getPaymentPlanByContractId(contractId);
}
