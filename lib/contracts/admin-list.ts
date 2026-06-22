import type { Prisma } from "@prisma/client";

export type ContractIndexRow = {
  id: string;
  contractNumber: string | null;
  reservationDate: string | null;
  departureDate: string | null;
  createdAt: Date;
  status?: string;
};

export function getContractListYear(contract: {
  contractNumber: string | null;
  reservationDate: string | null;
  departureDate: string | null;
  createdAt: Date | string;
}) {
  const number = String(contract.contractNumber ?? "");
  if (/^2025/.test(number)) {
    return 2025;
  }

  const dateCandidates = [
    contract.reservationDate,
    contract.departureDate,
    contract.createdAt,
  ];

  for (const candidate of dateCandidates) {
    if (!candidate) continue;
    const parsed = new Date(candidate);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.getFullYear();
    }
  }

  return null;
}

export function isContractFrom2025(contract: {
  contractNumber: string | null;
  reservationDate: string | null;
  departureDate: string | null;
  createdAt: Date | string;
}) {
  return getContractListYear(contract) === 2025;
}

export function sortContractsByFolioDesc<T extends ContractIndexRow>(contracts: T[]) {
  return [...contracts].sort((a, b) => {
    const aNumber = Number.parseInt(String(a.contractNumber ?? ""), 10);
    const bNumber = Number.parseInt(String(b.contractNumber ?? ""), 10);
    const safeA = Number.isFinite(aNumber) ? aNumber : -1;
    const safeB = Number.isFinite(bNumber) ? bNumber : -1;

    if (safeA !== safeB) return safeB - safeA;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}

export function getAdminContractWhere(
  adminRole: string,
  organizerKeys: string[],
  currentYear: number
) {
  const adminOrganizerFilters = organizerKeys.map((organizer) => ({
    organizer: { equals: organizer, mode: "insensitive" as const },
  }));

  return adminRole === "admin"
    ? {
        AND: [
          adminOrganizerFilters.length > 0 ? { OR: adminOrganizerFilters } : {},
          { reservationDate: { startsWith: String(currentYear) } },
        ],
      } satisfies Prisma.ContractWhereInput
    : undefined;
}
