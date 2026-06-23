import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";

import { SectionHeading } from "@/components/section-heading";
import {
  ADMIN_CONTRACTS_CACHE_TAG,
  ADMIN_PAYMENT_PLANS_CACHE_TAG,
} from "@/lib/admin-cache-tags";
import { getAdminFromCookies } from "@/lib/auth/admin";
import {
  getAdminContractWhere,
  isContractFrom2025,
  sortContractsByFolioDesc,
} from "@/lib/contracts/admin-list";
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

const INITIAL_CONTRACT_SECTION_LIMIT = 15;
const INITIAL_LEGACY_2025_LIMIT = 40;
const LEGACY_2025_LIMIT_STEP = 40;
const MIN_CONTRACT_NUMBER = 2141;
const ADMIN_CONTRACTS_CACHE_SECONDS = 30;

async function getNextContractNumber() {
  const result = await prisma.$queryRaw<{ max: number | null }[]>`
    SELECT MAX(CAST("contractNumber" AS INTEGER)) AS max
    FROM "Contract"
    WHERE "contractNumber" ~ '^[0-9]+$'
  `;
  const max = Math.max(result[0]?.max ?? 0, MIN_CONTRACT_NUMBER);
  return String(max + 1).padStart(4, "0");
}

const getCachedAdminUsers = unstable_cache(
  async () =>
    prisma.adminUser.findMany({
      select: {
        email: true,
        username: true,
        role: true,
      },
      orderBy: [{ username: "asc" }, { email: "asc" }],
    }),
  ["admin-contracts-users"],
  { revalidate: 60 }
);

const getCachedContractsPageData = unstable_cache(
  async (
    approvedLimit: number,
    pendingLimit: number,
    canceledLimit: number,
    adminRole: string,
    organizerKeys: string[],
    currentYear: number
  ) => {
    const contractWhere = getAdminContractWhere(
      adminRole,
      organizerKeys,
      currentYear
    );
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
    const legacy2025Rows = contractIndexRows.filter(isContractFrom2025);
    const currentContractRows = sortContractsByFolioDesc(
      contractIndexRows.filter((contract) => !isContractFrom2025(contract))
    );
    const approvedRows = currentContractRows.filter(
      (contract) => contract.status === "paid" || contract.status === "signed"
    );
    const pendingRows = currentContractRows.filter(
      (contract) => contract.status === "pending"
    );
    const canceledRows = currentContractRows.filter(
      (contract) => contract.status === "canceled"
    );
    const selectedRows = [
      ...pendingRows.slice(0, pendingLimit),
      ...approvedRows.slice(0, approvedLimit),
      ...canceledRows.slice(0, canceledLimit),
    ];
    const contractIds = selectedRows.map((contract) => contract.id);
    const contractOrder = new Map(
      contractIds.map((contractId, index) => [contractId, index])
    );

    const [rawContracts, suggestedContractNumber] = await Promise.all([
      contractIds.length
        ? getContracts({ where: { id: { in: contractIds } } })
        : Promise.resolve([]),
      getNextContractNumber(),
    ]);

    rawContracts.sort(
      (a, b) =>
        (contractOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
        (contractOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER)
    );

    return {
      rawContracts,
      sectionCounts: {
        approved: {
          loaded: Math.min(approvedLimit, approvedRows.length),
          total: approvedRows.length,
        },
        pending: {
          loaded: Math.min(pendingLimit, pendingRows.length),
          total: pendingRows.length,
        },
        canceled: {
          loaded: Math.min(canceledLimit, canceledRows.length),
          total: canceledRows.length,
        },
      },
      totalLegacy2025Contracts: legacy2025Rows.length,
      suggestedContractNumber,
    };
  },
  ["admin-contracts-page-data"],
  {
    revalidate: ADMIN_CONTRACTS_CACHE_SECONDS,
    tags: [ADMIN_CONTRACTS_CACHE_TAG],
  }
);

const getCachedPaymentPlanEntries = unstable_cache(
  async (contractIdsKey: string) => {
    const contractIds = contractIdsKey.split(",").filter(Boolean);
    const paymentPlansByContract = await getPaymentPlansByContractIds(contractIds);
    return Array.from(paymentPlansByContract.entries());
  },
  ["admin-contracts-payment-plans"],
  {
    revalidate: ADMIN_CONTRACTS_CACHE_SECONDS,
    tags: [ADMIN_PAYMENT_PLANS_CACHE_TAG],
  }
);

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

export default async function ContratosAdminPage() {
  const admin = await getAdminFromCookies();
  if (!admin) {
    redirect("/admin/login");
  }

  const adminUsers = await getCachedAdminUsers();
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
  const {
    rawContracts,
    sectionCounts,
    totalLegacy2025Contracts,
    suggestedContractNumber,
  } = await getCachedContractsPageData(
    INITIAL_CONTRACT_SECTION_LIMIT,
    INITIAL_CONTRACT_SECTION_LIMIT,
    INITIAL_CONTRACT_SECTION_LIMIT,
    admin.role,
    Array.from(normalizedOrganizerKeys),
    currentYear
  );
  const paymentPlansByContract = new Map(
    await getCachedPaymentPlanEntries(
      rawContracts.map((contract) => contract.id).join(",")
    )
  );
  const visibleContracts = rawContracts.map((contract) =>
    applyPaymentPlanSummaryToContract(
      contract,
      paymentPlansByContract.get(contract.id) ?? null
    )
  );

  const latestContract = visibleContracts[0] ?? null;
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
              suggestedContractNumber={suggestedContractNumber}
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
        sectionCounts={sectionCounts}
        legacy2025TotalCount={totalLegacy2025Contracts}
        legacy2025InitialLimit={INITIAL_LEGACY_2025_LIMIT}
        legacy2025LimitStep={LEGACY_2025_LIMIT_STEP}
      />
    </div>
    </ContractsToastProvider>
  );
}
