import { NextResponse } from "next/server";

import { getAdminFromCookies } from "@/lib/auth/admin";
import { sortContractsByFolioDesc } from "@/lib/contracts/admin-list";
import { getContracts } from "@/lib/db";
import { prisma } from "@/lib/prisma";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { buildEmptyTransactionsByType } from "@/lib/transactions";
import type { Prisma } from "@prisma/client";
import type { TransactionStatus, TransactionType } from "@/types/transactions";

export const runtime = "nodejs";

type TransactionSummaryRow = {
  contract_id: string;
  type: TransactionType;
  status: TransactionStatus;
};

type PaymentPlanForAlertRow = {
  contract_id: string;
};

type PaymentInstallmentAlertRow = {
  due_date: string;
  payment_plans: PaymentPlanForAlertRow | PaymentPlanForAlertRow[] | null;
};

const normalize = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const normalizeContact = (value: string) => normalize(value).replace(/\s+/g, "");

function matchesValue(value: string | number | null | undefined, query: string) {
  if (!query) return true;
  if (value === null || value === undefined) return false;
  return normalize(String(value)).includes(query);
}

function getMetadataValue(metadata: Prisma.JsonValue, key: string) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return "";
  const value = metadata[key];
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function getInstallmentPlan(row: PaymentInstallmentAlertRow) {
  return Array.isArray(row.payment_plans) ? row.payment_plans[0] : row.payment_plans;
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

function buildEmptyTransactionSummary() {
  return {
    customerPaymentCount: 0,
    wholesalerPaymentCount: 0,
    pendingCustomerPaymentCount: 0,
  };
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

function buildContractSearchText(contract: Awaited<ReturnType<typeof getContracts>>[number]) {
  const travelerText = contract.travelers
    .flatMap((traveler) => [traveler.name, traveler.phone, traveler.contract])
    .filter(Boolean)
    .join(" ");
  const metadataText = [
    contract.metadata.contact,
    contract.metadata.phone,
    contract.metadata.telefono,
    contract.metadata.whatsapp,
    contract.metadata.email,
  ]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)
    .join(" ");

  return [
    contract.id,
    contract.contractNumber,
    contract.clientName,
    contract.destination,
    contract.hotel,
    contract.supplier,
    contract.organizer,
    contract.seller,
    contract.title,
    travelerText,
    metadataText,
  ]
    .filter(Boolean)
    .join(" ");
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
      .select("due_date, payment_plans!inner(contract_id)")
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

export async function GET(request: Request) {
  const admin = await getAdminFromCookies();
  if (!admin) {
    return NextResponse.json({ error: "Sesion no valida." }, { status: 401 });
  }

  const url = new URL(request.url);
  const query = normalize(String(url.searchParams.get("q") ?? ""));
  const contactQuery = normalizeContact(query);

  if (query.length < 3) {
    return NextResponse.json({ contracts: [] });
  }

  const activeContractWhere = {
    status: { not: "canceled" },
  } satisfies Prisma.ContractWhereInput;

  const candidateRows = await prisma.contract.findMany({
    where: activeContractWhere,
    select: {
      id: true,
      contractNumber: true,
      reservationDate: true,
      departureDate: true,
      createdAt: true,
      title: true,
      clientName: true,
      destination: true,
      hotel: true,
      supplier: true,
      organizer: true,
      seller: true,
      travelers: true,
      metadata: true,
    },
  });

  const foundRows = sortContractsByFolioDesc(candidateRows).filter((contract) => {
    const travelerMatches =
      Array.isArray(contract.travelers) &&
      contract.travelers.some((traveler) => {
        if (!traveler || typeof traveler !== "object" || Array.isArray(traveler)) {
          return false;
        }
        const name = "name" in traveler ? String(traveler.name ?? "") : "";
        const phone = "phone" in traveler ? String(traveler.phone ?? "") : "";
        const travelerContract =
          "contract" in traveler ? String(traveler.contract ?? "") : "";
        return (
          matchesValue(name, query) ||
          matchesValue(travelerContract, query) ||
          normalizeContact(phone).includes(contactQuery)
        );
      });
    const metadataMatches = [
      "contact",
      "phone",
      "telefono",
      "whatsapp",
      "email",
    ].some((key) => {
      const value = getMetadataValue(contract.metadata, key);
      return matchesValue(value, query) || normalizeContact(value).includes(contactQuery);
    });

    return (
      matchesValue(contract.id, query) ||
      matchesValue(contract.contractNumber, query) ||
      matchesValue(contract.title, query) ||
      matchesValue(contract.clientName, query) ||
      matchesValue(contract.destination, query) ||
      matchesValue(contract.hotel, query) ||
      matchesValue(contract.supplier, query) ||
      matchesValue(contract.organizer, query) ||
      matchesValue(contract.seller, query) ||
      travelerMatches ||
      metadataMatches
    );
  });

  const contractIds = foundRows.map((contract) => contract.id);
  const contractOrder = new Map(
    contractIds.map((contractIdValue, index) => [contractIdValue, index])
  );
  const rawContracts = contractIds.length
    ? await getContracts({ where: { id: { in: contractIds } } })
    : [];
  rawContracts.sort(
    (a, b) =>
      (contractOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
      (contractOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER)
  );

  const [transactionSummaryRows, paymentAlertRows] = await Promise.all([
    getTransactionSummaries(contractIds),
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
  const contractIdSet = new Set(contractIds);
  const paymentAlertCountsByContract = new Map<
    string,
    { overdue: number; upcoming: number }
  >();
  for (const row of paymentAlertRows) {
    const contractId = getInstallmentPlan(row)?.contract_id;
    if (!contractId || !contractIdSet.has(contractId)) continue;

    const counts =
      paymentAlertCountsByContract.get(contractId) ?? { overdue: 0, upcoming: 0 };
    if (row.due_date < today) {
      counts.overdue += 1;
    } else {
      counts.upcoming += 1;
    }
    paymentAlertCountsByContract.set(contractId, counts);
  }

  const contracts = rawContracts.map((contract) => ({
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
    searchText: buildContractSearchText(contract),
  }));

  return NextResponse.json({ contracts, totalMatches: foundRows.length });
}
