import { redirect } from "next/navigation";

import { SectionHeading } from "@/components/section-heading";
import { getAdminFromCookies } from "@/lib/auth/admin";
import { getContracts } from "@/lib/db";
import { getPaymentPlansByContractIds, type PaymentPlan } from "@/lib/payment-plans";
import { prisma } from "@/lib/prisma";
import { ALLOW_CONTRACT_NUMBER_EDIT_FOR_ALL_ROLES } from "@/lib/contracts/config";

import { ContractForm } from "./ContractForm";
import ContractsToastProvider from "./ContractsToastProvider";
import ContractsPanel from "./ContractsPanel";
import {
  createContractAction,
  deleteContractAction,
  bulkDeleteContractsAction,
  updateContractAction,
} from "./actions";

export const dynamic = "force-dynamic";

type ReservationParts = { year: number; month: number; day: number };

function getNextContractNumber(contracts: Awaited<ReturnType<typeof getContracts>>) {
  const base = 2141;
  let max = base;
  contracts.forEach((contract) => {
    const value = String(contract.contractNumber ?? "").trim();
    if (!/^\d+$/.test(value)) return;
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > max) {
      max = parsed;
    }
  });
  return String(max + 1).padStart(4, "0");
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

function parseReservationParts(value?: string | null): ReservationParts | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const ymdMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymdMatch) {
    const year = Number(ymdMatch[1]);
    const month = Number(ymdMatch[2]);
    const day = Number(ymdMatch[3]);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
      return null;
    }
    return { year, month, day };
  }

  const slashMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (slashMatch) {
    const first = Number(slashMatch[1]);
    const second = Number(slashMatch[2]);
    const year = Number(slashMatch[3]);
    if (!Number.isFinite(year) || !Number.isFinite(first) || !Number.isFinite(second)) {
      return null;
    }

    let month = first;
    let day = second;

    if (first > 12 && second <= 12) {
      day = first;
      month = second;
    } else if (second > 12 && first <= 12) {
      month = first;
      day = second;
    } else {
      month = first;
      day = second;
    }

    if (month < 1 || month > 12 || day < 1 || day > 31) {
      const swappedMonth = second;
      const swappedDay = first;
      if (swappedMonth >= 1 && swappedMonth <= 12 && swappedDay >= 1 && swappedDay <= 31) {
        return { year, month: swappedMonth, day: swappedDay };
      }
      return null;
    }

    return { year, month, day };
  }

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  return { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() };
}

export default async function ContratosAdminPage() {
  const admin = await getAdminFromCookies();
  if (!admin) {
    redirect("/admin/login");
  }

  const rawContracts = await getContracts();
  const paymentPlansByContract = await getPaymentPlansByContractIds(
    rawContracts.map((contract) => contract.id)
  );
  const contracts = rawContracts.map((contract) =>
    applyPaymentPlanSummaryToContract(
      contract,
      paymentPlansByContract.get(contract.id) ?? null
    )
  );
  const adminUsers = await prisma.adminUser.findMany({
    orderBy: [{ username: "asc" }, { email: "asc" }],
  });
  const currentAdminUser = adminUsers.find((user) => user.email === admin.email);
  const organizerOptions = adminUsers.map((user) => ({
    value: user.username || user.email,
    label: `${user.username || user.email} (${user.role})`,
  }));

  const normalizedOrganizerKeys = new Set(
    [
      currentAdminUser?.username,
      currentAdminUser?.email,
      admin.email,
    ]
      .filter(Boolean)
      .map((value) => value!.trim().toLowerCase())
  );

  const currentYear = new Date().getFullYear();
  const visibleContracts =
    admin.role === "admin"
      ? contracts.filter((contract) => {
          const organizer = contract.organizer?.trim().toLowerCase();
          if (!organizer || !normalizedOrganizerKeys.has(organizer)) return false;
          const year = parseReservationParts(contract.reservationDate)?.year;
          return year === currentYear;
        })
      : contracts;

  const latestContract = visibleContracts[0] ?? null;
  const nextContractNumber = getNextContractNumber(contracts);
  const canEditContractNumber =
    ALLOW_CONTRACT_NUMBER_EDIT_FOR_ALL_ROLES || admin.role === "owner";

  return (
    <ContractsToastProvider>
    <div className="space-y-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <SectionHeading
          title="Contratos"
          subtitle="Genera contratos, controla pendientes y crea viajes."
          kicker="Admin"
        />
      </div>

      <section className="rounded-3xl border border-brand-200/70 bg-brand-100/70 shadow-sm">
        <details className="group">
          <summary className="cursor-pointer list-none px-6 py-4 [&::-webkit-details-marker]:hidden">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-lg text-brand-950">Nuevo contrato</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Crea el contrato con los datos del viaje y la lista de pasajeros.
                </p>
              </div>
              <span className="rounded-full border border-brand-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
                Agregar
              </span>
            </div>
          </summary>
          <div className="border-t border-slate-200 px-6 py-4">
            <ContractForm
              action={createContractAction}
              draftContract={latestContract}
              submitLabel="Crear contrato"
              organizerOptions={organizerOptions}
              suggestedContractNumber={nextContractNumber}
              canEditContractNumber={canEditContractNumber}
            />
          </div>
        </details>
      </section>

      <ContractsPanel
        contracts={visibleContracts}
        updateAction={updateContractAction}
        deleteAction={deleteContractAction}
        bulkDeleteAction={bulkDeleteContractsAction}
        organizerOptions={organizerOptions}
        canEditContractNumber={canEditContractNumber}
        currentAdminRole={admin.role}
      />
    </div>
    </ContractsToastProvider>
  );
}
