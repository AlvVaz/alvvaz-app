import { NextResponse } from "next/server";

import { getAdminFromCookies } from "@/lib/auth/admin";
import {
  getAdminContractWhere,
  isContractFrom2025,
  sortContractsByFolioDesc,
} from "@/lib/contracts/admin-list";
import { getContracts } from "@/lib/db";
import { getPaymentPlansByContractIds, type PaymentPlan } from "@/lib/payment-plans";
import { prisma } from "@/lib/prisma";

const INITIAL_CONTRACT_LIMIT = 40;
const CONTRACT_LIMIT_STEP = 40;
const MAX_CONTRACT_LIMIT = 600;

function parseContractLimit(value?: string | null) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed < INITIAL_CONTRACT_LIMIT) {
    return INITIAL_CONTRACT_LIMIT;
  }
  return Math.min(parsed, MAX_CONTRACT_LIMIT);
}

function formatContractMoney(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return value;
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(parsed);
}

function applyPaymentPlanSummaryToContract(
  contract: Awaited<ReturnType<typeof getContracts>>[number],
  plan: PaymentPlan | null
) {
  if (!plan) return contract;

  const balance = Number(plan.totalAmount) - Number(plan.depositAmount);
  return {
    ...contract,
    totalPrice: formatContractMoney(plan.totalAmount),
    firstPayment: formatContractMoney(plan.depositAmount),
    balanceDue: Number.isFinite(balance)
      ? formatContractMoney(Math.max(balance, 0).toFixed(2))
      : contract.balanceDue,
    liquidationDate: plan.endDate,
    metadata: {
      ...contract.metadata,
      paymentPlan: {
        frequency: plan.frequency,
        startDate: plan.startDate,
        endDate: plan.endDate,
        installmentCount: plan.installmentCount,
        updatedFrom: "payment_plans",
        updatedAt: plan.updatedAt ?? plan.createdAt ?? null,
      },
    },
  };
}

export async function GET(request: Request) {
  const admin = await getAdminFromCookies();
  if (!admin) {
    return NextResponse.json({ error: "Sesion no valida." }, { status: 401 });
  }

  const url = new URL(request.url);
  const contractLimit = parseContractLimit(url.searchParams.get("limit"));
  const adminUsers = await prisma.adminUser.findMany({
    select: {
      email: true,
      username: true,
    },
  });
  const currentAdminUser = adminUsers.find((user) => user.email === admin.email);
  const organizerKeys = [
    currentAdminUser?.username,
    currentAdminUser?.email,
    admin.email,
  ]
    .filter(Boolean)
    .map((value) => value!.trim().toLowerCase());
  const currentYear = new Date().getFullYear();
  const contractWhere = getAdminContractWhere(admin.role, organizerKeys, currentYear);

  const contractIndexRows = await prisma.contract.findMany({
    where: contractWhere,
    select: {
      id: true,
      contractNumber: true,
      reservationDate: true,
      departureDate: true,
      createdAt: true,
    },
  });
  const legacy2025Rows = sortContractsByFolioDesc(
    contractIndexRows.filter(isContractFrom2025)
  );
  const contractIds = legacy2025Rows
    .slice(0, contractLimit)
    .map((contract) => contract.id);
  const contractOrder = new Map(
    contractIds.map((contractId, index) => [contractId, index])
  );

  const rawContracts = contractIds.length
    ? await getContracts({ where: { id: { in: contractIds } } })
    : [];
  rawContracts.sort(
    (a, b) =>
      (contractOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
      (contractOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER)
  );

  const paymentPlansByContract = new Map(
    Array.from(
      await getPaymentPlansByContractIds(rawContracts.map((contract) => contract.id))
    )
  );
  const contracts = rawContracts.map((contract) =>
    applyPaymentPlanSummaryToContract(
      contract,
      paymentPlansByContract.get(contract.id) ?? null
    )
  );
  const totalCount = legacy2025Rows.length;

  return NextResponse.json({
    contracts,
    loadedCount: contracts.length,
    totalCount,
    nextLimit: Math.min(contractLimit + CONTRACT_LIMIT_STEP, totalCount),
  });
}
