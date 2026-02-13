export type AdminRoleForContracts = "owner" | "admin" | "tech";

export const ADMIN_CONTRACT_EDIT_WINDOW_MS = 36 * 60 * 60 * 1000;

function toDate(value: string | Date): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function canEditContractByRole(
  role: AdminRoleForContracts,
  contractCreatedAt: string | Date,
  now = new Date()
): boolean {
  if (role === "owner" || role === "tech") {
    return true;
  }

  const createdAt = toDate(contractCreatedAt);
  if (!createdAt) {
    return false;
  }

  return now.getTime() - createdAt.getTime() <= ADMIN_CONTRACT_EDIT_WINDOW_MS;
}