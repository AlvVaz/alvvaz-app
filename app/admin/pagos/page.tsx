import { redirect } from "next/navigation";

import { SectionHeading } from "@/components/section-heading";
import ToastProvider from "@/components/ui/toast";
import { getAdminFromCookies } from "@/lib/auth/admin";
import { getContracts } from "@/lib/db";
import { getPaymentPlansByContractIds } from "@/lib/payment-plans";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { buildEmptyTransactionsByType, mapTransaction, type TransactionRow } from "@/lib/transactions";
import type { TransactionsByType } from "@/types/transactions";

import { PaymentsContractsList, type PaymentContract } from "./components/ContractCard";

export const dynamic = "force-dynamic";

function buildTransactionsByContract(rows: TransactionRow[]) {
  const grouped = new Map<string, TransactionsByType>();

  rows.map(mapTransaction).forEach((transaction) => {
    const current = grouped.get(transaction.contractId) ?? buildEmptyTransactionsByType();
    current[transaction.type].push(transaction);
    grouped.set(transaction.contractId, current);
  });

  return grouped;
}

async function getTransactionRows(contractIds: string[]) {
  if (contractIds.length === 0) return [];

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("contract_transactions")
      .select("*, transaction_attachments(*)")
      .in("contract_id", contractIds)
      .order("date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });

    if (error) {
      console.error("No se pudieron cargar transacciones:", error.message);
      return [];
    }

    return (data ?? []) as TransactionRow[];
  } catch (error) {
    console.error("No se pudo conectar a Supabase para pagos:", error);
    return [];
  }
}

function getTodayDateOnly() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default async function PagosAdminPage() {
  const admin = await getAdminFromCookies();
  if (!admin) {
    redirect("/admin/login");
  }

  const contracts = await getContracts();
  const activeContracts = contracts.filter((contract) => contract.status !== "canceled");
  const activeContractIds = activeContracts.map((contract) => contract.id);
  const transactionsByContract = buildTransactionsByContract(
    await getTransactionRows(activeContractIds)
  );
  const paymentPlansByContract = await getPaymentPlansByContractIds(activeContractIds);

  const paymentContracts: PaymentContract[] = activeContracts.map((contract) => ({
    id: contract.id,
    contractNumber: contract.contractNumber,
    clientName: contract.clientName,
    destination: contract.destination,
    reservationDate: contract.reservationDate,
    departureDate: contract.departureDate,
    liquidationDate: contract.liquidationDate,
    totalPrice: contract.totalPrice,
    firstPayment: contract.firstPayment,
    status: contract.status,
    transactions: transactionsByContract.get(contract.id) ?? buildEmptyTransactionsByType(),
    paymentPlan: paymentPlansByContract.get(contract.id) ?? null,
  }));
  const today = getTodayDateOnly();
  const overdueInstallmentCount = paymentContracts.reduce(
    (count, contract) =>
      count +
      (contract.paymentPlan?.installments.filter(
        (installment) => installment.status === "pendiente" && installment.dueDate < today
      ).length ?? 0),
    0
  );
  const supplierOptions = Array.from(
    new Set(
      activeContracts
        .map((contract) => contract.supplier?.trim())
        .filter((supplier): supplier is string => Boolean(supplier))
    )
  ).sort((a, b) => a.localeCompare(b, "es"));

  return (
    <ToastProvider>
      <div className="space-y-10">
        <SectionHeading
          title="Pagos"
          subtitle="Registra cobros, pagos a mayoristas y comprobantes por contrato."
          kicker="Admin"
        />

        {overdueInstallmentCount > 0 ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700">
            Hay {overdueInstallmentCount} pago(s) vencido(s) en los planes de pago.
          </div>
        ) : null}

        <PaymentsContractsList contracts={paymentContracts} supplierOptions={supplierOptions} />
      </div>
    </ToastProvider>
  );
}
