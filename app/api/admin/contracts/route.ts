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

const CONTRACT_LIMIT = 15;
const MAX_OFFSET = 600;

type ContractSection = "approved" | "pending" | "canceled";

function parseOffset(value: string | null) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.min(parsed, MAX_OFFSET);
}

function isContractSection(value: string | null): value is ContractSection {
  return value === "approved" || value === "pending" || value === "canceled";
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
  const section = url.searchParams.get("section");
  if (!isContractSection(section)) {
    return NextResponse.json({ error: "Seccion no valida." }, { status: 400 });
  }
  const offset = parseOffset(url.searchParams.get("offset"));

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
      status: true,
    },
  });
  const currentContractRows = sortContractsByFolioDesc(
    contractIndexRows.filter((contract) => !isContractFrom2025(contract))
  );
  const sectionRows = currentContractRows.filter((contract) => {
    if (section === "approved") {
      return contract.status === "paid" || contract.status === "signed";
    }
    return contract.status === section;
  });
  const selectedRows = sectionRows.slice(offset, offset + CONTRACT_LIMIT);
  const contractIds = selectedRows.map((contract) => contract.id);
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
    Array.from(await getPaymentPlansByContractIds(contractIds))
  );
  const contracts = rawContracts.map((contract) =>
    applyPaymentPlanSummaryToContract(
      contract,
      paymentPlansByContract.get(contract.id) ?? null
    )
  );

  return NextResponse.json({
    contracts,
    loadedCount: Math.min(offset + contracts.length, sectionRows.length),
    totalCount: sectionRows.length,
  });
}
