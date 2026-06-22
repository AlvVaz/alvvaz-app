import { NextResponse } from "next/server";

import { getAdminFromCookies } from "@/lib/auth/admin";
import { getAdminContractWhere } from "@/lib/contracts/admin-list";
import { getContracts } from "@/lib/db";
import { getPaymentPlansByContractIds, type PaymentPlan } from "@/lib/payment-plans";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const runtime = "nodejs";

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

const normalize = (value: string) => value.trim().toLowerCase();
const normalizeContact = (value: string) => normalize(value).replace(/\s+/g, "");

const matchesValue = (value: string | null | undefined, query: string) => {
  if (!query) return true;
  if (!value) return false;
  return normalize(value).includes(query);
};

function getMetadataValue(metadata: Prisma.JsonValue, key: string) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return "";
  const value = metadata[key];
  return typeof value === "string" ? value : "";
}

export async function GET(request: Request) {
  const admin = await getAdminFromCookies();
  if (!admin) {
    return NextResponse.json({ error: "Sesion no valida." }, { status: 401 });
  }

  const url = new URL(request.url);
  const contractId = String(url.searchParams.get("contractId") ?? "")
    .trim()
    .replace(/^#/, "");
  const name = normalize(String(url.searchParams.get("name") ?? ""));
  const contact = normalizeContact(String(url.searchParams.get("contact") ?? ""));

  if (!contractId && !name && !contact) {
    return NextResponse.json({ contracts: [] });
  }

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
  const visibilityWhere = getAdminContractWhere(admin.role, organizerKeys, currentYear);

  const candidateRows = await prisma.contract.findMany({
    where: visibilityWhere,
    select: {
      id: true,
      contractNumber: true,
      title: true,
      clientName: true,
      destination: true,
      travelers: true,
      metadata: true,
    },
    orderBy: [{ createdAt: "desc" }],
  });
  const foundRows = candidateRows.filter((contract) => {
    const matchesId =
      !contractId ||
      matchesValue(contract.contractNumber, contractId) ||
      matchesValue(contract.id, contractId);

    const matchesName =
      !name ||
      matchesValue(contract.title, name) ||
      matchesValue(contract.clientName, name) ||
      matchesValue(contract.destination, name);

    const travelerMatches =
      Array.isArray(contract.travelers) &&
      contract.travelers.some((traveler) => {
        if (!traveler || typeof traveler !== "object" || Array.isArray(traveler)) {
          return false;
        }
        const phone = "phone" in traveler ? String(traveler.phone ?? "") : "";
        return normalizeContact(phone).includes(contact);
      });
    const metadataMatches =
      matchesValue(normalizeContact(getMetadataValue(contract.metadata, "contact")), contact) ||
      matchesValue(normalizeContact(getMetadataValue(contract.metadata, "phone")), contact) ||
      matchesValue(normalizeContact(getMetadataValue(contract.metadata, "email")), contact);
    const matchesContact = !contact || travelerMatches || metadataMatches;

    return matchesId && matchesName && matchesContact;
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
  const paymentPlansByContract = new Map(
    Array.from(await getPaymentPlansByContractIds(contractIds))
  );
  const contracts = rawContracts.map((contract) =>
    applyPaymentPlanSummaryToContract(
      contract,
      paymentPlansByContract.get(contract.id) ?? null
    )
  );

  return NextResponse.json({ contracts });
}
