import { redirect } from "next/navigation";

import ToastProvider from "@/components/ui/toast";
import { getAdminFromCookies } from "@/lib/auth/admin";
import { sortContractsByFolioDesc } from "@/lib/contracts/admin-list";
import { getContracts } from "@/lib/db";
import { prisma } from "@/lib/prisma";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { buildEmptyTransactionsByType } from "@/lib/transactions";
import type { Prisma } from "@prisma/client";
import type { TransactionStatus, TransactionType } from "@/types/transactions";

import {
  PaymentsContractsList,
  type InitialPaymentAlert,
  type PaymentContract,
} from "./components/ContractCard";

export const dynamic = "force-dynamic";

type PagosAdminPageProps = {
  searchParams?: { limit?: string };
};

type TransactionSummaryRow = {
  contract_id: string;
  type: TransactionType;
  status: TransactionStatus;
};

type PaymentPlanForAlertRow = {
  contract_id: string;
};

type PaymentInstallmentAlertRow = {
  id: string;
  plan_id: string;
  installment_number: number;
  due_date: string;
  amount: string | number;
  status: "pendiente";
  transaction_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  payment_plans: PaymentPlanForAlertRow | PaymentPlanForAlertRow[] | null;
};

const INITIAL_PAYMENT_CONTRACT_LIMIT = 50;
const PAYMENT_CONTRACT_LIMIT_STEP = 50;
const MAX_PAYMENT_CONTRACT_LIMIT = 800;

function parsePaymentContractLimit(value?: string) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed < INITIAL_PAYMENT_CONTRACT_LIMIT) {
    return INITIAL_PAYMENT_CONTRACT_LIMIT;
  }
  return Math.min(parsed, MAX_PAYMENT_CONTRACT_LIMIT);
}

function getTodayDateOnly() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDaysDateOnly(dateOnly: string, days: number) {
  const date = new Date(`${dateOnly}T00:00:00`);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function diffDays(fromDateOnly: string, toDateOnly: string) {
  const from = new Date(`${fromDateOnly}T00:00:00`).getTime();
  const to = new Date(`${toDateOnly}T00:00:00`).getTime();
  if (!Number.isFinite(from) || !Number.isFinite(to)) return 0;
  return Math.floor((to - from) / 86_400_000);
}

function getInstallmentPlan(row: PaymentInstallmentAlertRow) {
  return Array.isArray(row.payment_plans) ? row.payment_plans[0] : row.payment_plans;
}

function buildEmptyTransactionSummary() {
  return {
    customerPaymentCount: 0,
    wholesalerPaymentCount: 0,
    pendingCustomerPaymentCount: 0,
  };
}

async function getTransactionSummaries(contractIds: string[]) {
  if (contractIds.length === 0) return [];

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("contract_transactions")
      .select("contract_id, type, status")
      .in("contract_id", contractIds)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("No se pudieron cargar resumenes de transacciones:", error.message);
      return [];
    }

    return (data ?? []) as TransactionSummaryRow[];
  } catch (error) {
    console.error("No se pudo conectar a Supabase para resumenes de pagos:", error);
    return [];
  }
}

async function getPaymentAlertRows() {
  const today = getTodayDateOnly();
  const soon = addDaysDateOnly(today, 7);

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("payment_installments")
      .select(
        "id, plan_id, installment_number, due_date, amount, status, transaction_id, created_at, updated_at, payment_plans!inner(contract_id)"
      )
      .eq("status", "pendiente")
      .lte("due_date", soon)
      .order("due_date", { ascending: true });

    if (error) {
      console.error("No se pudieron cargar alertas de pagos:", error.message);
      return [];
    }

    return (data ?? []) as PaymentInstallmentAlertRow[];
  } catch (error) {
    console.error("No se pudo conectar a Supabase para alertas de pagos:", error);
    return [];
  }
}

function getContractPhone(contract: Awaited<ReturnType<typeof getContracts>>[number]) {
  const travelerPhone = contract.travelers
    .map((traveler) => traveler.phone.trim())
    .find(Boolean);
  if (travelerPhone) return travelerPhone;

  const metadataPhoneCandidates = [
    contract.metadata.phone,
    contract.metadata.contact,
    contract.metadata.telefono,
    contract.metadata.whatsapp,
  ];
  return (
    metadataPhoneCandidates
      .map((value) => String(value ?? "").trim())
      .find(Boolean) ?? null
  );
}

export default async function PagosAdminPage({ searchParams }: PagosAdminPageProps) {
  const admin = await getAdminFromCookies();
  if (!admin) {
    redirect("/admin/login");
  }

  const contractLimit = parsePaymentContractLimit(searchParams?.limit);
  const activeContractWhere = {
    status: { not: "canceled" },
  } satisfies Prisma.ContractWhereInput;
  const [contractIndexRows, totalActiveContracts, supplierRows] = await Promise.all([
    prisma.contract.findMany({
      where: activeContractWhere,
      select: {
        id: true,
        contractNumber: true,
        reservationDate: true,
        departureDate: true,
        createdAt: true,
      },
    }),
    prisma.contract.count({ where: activeContractWhere }),
    prisma.contract.findMany({
      where: activeContractWhere,
      select: { supplier: true },
      distinct: ["supplier"],
    }),
  ]);
  const activeContractIdsForPage = sortContractsByFolioDesc(contractIndexRows)
    .slice(0, contractLimit)
    .map((contract) => contract.id);
  const contractOrder = new Map(
    activeContractIdsForPage.map((contractId, index) => [contractId, index])
  );
  const activeContracts = activeContractIdsForPage.length
    ? await getContracts({ where: { id: { in: activeContractIdsForPage } } })
    : [];
  activeContracts.sort(
    (a, b) =>
      (contractOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
      (contractOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER)
  );
  const activeContractIds = activeContracts.map((contract) => contract.id);
  const activeContractIdSet = new Set(activeContractIds);
  const [transactionSummaryRows, paymentAlertRows] = await Promise.all([
    getTransactionSummaries(activeContractIds),
    getPaymentAlertRows(),
  ]);

  const transactionSummariesByContract = new Map<
    string,
    ReturnType<typeof buildEmptyTransactionSummary>
  >();
  for (const row of transactionSummaryRows) {
    const summary =
      transactionSummariesByContract.get(row.contract_id) ?? buildEmptyTransactionSummary();
    if (row.type === "customer_payment") {
      summary.customerPaymentCount += 1;
      if (row.status === "pendiente") {
        summary.pendingCustomerPaymentCount += 1;
      }
    } else if (row.type === "wholesaler_payment") {
      summary.wholesalerPaymentCount += 1;
    }
    transactionSummariesByContract.set(row.contract_id, summary);
  }

  const today = getTodayDateOnly();
  const tomorrow = addDaysDateOnly(today, 1);
  const paymentAlertCountsByContract = new Map<
    string,
    { overdue: number; upcoming: number }
  >();
  const paymentAlerts: InitialPaymentAlert[] = paymentAlertRows.flatMap((row) => {
    const plan = getInstallmentPlan(row);
    const contractId = plan?.contract_id;
    if (!contractId || !activeContractIdSet.has(contractId)) return [];

    const counts =
      paymentAlertCountsByContract.get(contractId) ?? { overdue: 0, upcoming: 0 };
    if (row.due_date < today) {
      counts.overdue += 1;
    } else {
      counts.upcoming += 1;
    }
    paymentAlertCountsByContract.set(contractId, counts);

    const category: InitialPaymentAlert["category"] =
      row.due_date < today
        ? "overdue"
        : row.due_date === tomorrow
        ? "tomorrow"
        : "upcoming";

    return [
      {
        key: `${contractId}-${row.id}`,
        category,
        contractId,
        installment: {
          id: row.id,
          planId: row.plan_id,
          installmentNumber: row.installment_number,
          dueDate: row.due_date,
          amount: String(row.amount),
          status: row.status,
          transactionId: row.transaction_id,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        },
        daysOverdue: Math.max(diffDays(row.due_date, today), 0),
      },
    ];
  });

  const paymentContracts: PaymentContract[] = activeContracts.map((contract) => ({
    id: contract.id,
    contractNumber: contract.contractNumber,
    clientName: contract.clientName,
    destination: contract.destination,
    travelers: contract.travelers,
    contactPhone: getContractPhone(contract),
    reservationDate: contract.reservationDate,
    departureDate: contract.departureDate,
    liquidationDate: contract.liquidationDate,
    totalPrice: contract.totalPrice,
    firstPayment: contract.firstPayment,
    status: contract.status,
    transactions: buildEmptyTransactionsByType(),
    transactionsLoaded: false,
    transactionSummary:
      transactionSummariesByContract.get(contract.id) ?? buildEmptyTransactionSummary(),
    paymentPlan: null,
    paymentPlanLoaded: false,
    paymentAlertSummary:
      paymentAlertCountsByContract.get(contract.id) ?? { overdue: 0, upcoming: 0 },
    generalNotes: contract.generalNotes ?? null,
  }));
  const supplierOptions = Array.from(
    new Set(
      supplierRows
        .map((contract) => contract.supplier?.trim())
        .filter((supplier): supplier is string => Boolean(supplier))
    )
  ).sort((a, b) => a.localeCompare(b, "es"));

  return (
    <ToastProvider>
      <div className="space-y-10">
        <PaymentsContractsList
          contracts={paymentContracts}
          supplierOptions={supplierOptions}
          initialAlerts={paymentAlerts}
          loadedCount={paymentContracts.length}
          totalCount={totalActiveContracts}
          nextLimit={Math.min(
            contractLimit + PAYMENT_CONTRACT_LIMIT_STEP,
            totalActiveContracts
          )}
        />
      </div>
    </ToastProvider>
  );
}
