import { redirect } from "next/navigation";

import { SectionHeading } from "@/components/section-heading";
import { getAdminFromCookies } from "@/lib/auth/admin";
import { getContracts } from "@/lib/db";
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

export default async function PagosAdminPage() {
  const admin = await getAdminFromCookies();
  if (!admin) {
    redirect("/admin/login");
  }

  const contracts = await getContracts();
  const activeContracts = contracts
    .filter((contract) => contract.status !== "canceled")
    .sort((a, b) => {
      const numA = a.contractNumber ? parseInt(a.contractNumber, 10) : -1;
      const numB = b.contractNumber ? parseInt(b.contractNumber, 10) : -1;
      return numB - numA;
    });
  const transactionsByContract = buildTransactionsByContract(
    await getTransactionRows(activeContracts.map((contract) => contract.id))
  );

  const paymentContracts: PaymentContract[] = activeContracts.map((contract) => ({
    id: contract.id,
    contractNumber: contract.contractNumber,
    clientName: contract.clientName,
    destination: contract.destination,
    status: contract.status,
    transactions: transactionsByContract.get(contract.id) ?? buildEmptyTransactionsByType(),
  }));
  const supplierOptions = Array.from(
    new Set(
      activeContracts
        .map((contract) => contract.supplier?.trim())
        .filter((supplier): supplier is string => Boolean(supplier))
    )
  ).sort((a, b) => a.localeCompare(b, "es"));

  return (
    <div className="space-y-10">
      <SectionHeading
        title="Pagos"
        subtitle="Registra cobros, pagos a mayoristas y comprobantes por contrato."
        kicker="Admin"
      />

      <PaymentsContractsList contracts={paymentContracts} supplierOptions={supplierOptions} />
    </div>
  );
}
