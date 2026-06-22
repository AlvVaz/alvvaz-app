import { unstable_cache } from "next/cache";
import { redirect } from "next/navigation";

import { ADMIN_COMMISSIONS_CACHE_TAG } from "@/lib/admin-cache-tags";
import { getAdminFromCookies } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";

import {
  AnalysisDashboard,
  type AnalysisContract,
  type AnalysisTrip,
} from "./AnalysisDashboard";

export const dynamic = "force-dynamic";

const ADMIN_COMMISSIONS_CACHE_SECONDS = 30;

const getCachedComisionesData = unstable_cache(
  async () => {
    const [contracts, trips, adminUsers] = await Promise.all([
      prisma.contract.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          tripId: true,
          contractNumber: true,
          reservationDate: true,
          seller: true,
          organizer: true,
          departureDate: true,
          returnDate: true,
          supplier: true,
          totalPrice: true,
          status: true,
          isSigned: true,
          isPaid: true,
        },
      }),
      prisma.trip.findMany({
        select: {
          id: true,
          organizer: true,
        },
      }),
      prisma.adminUser.findMany({
        where: { role: { in: ["admin", "owner"] } },
        select: {
          email: true,
          username: true,
        },
        orderBy: [{ username: "asc" }, { email: "asc" }],
      }),
    ]);

    return { contracts, trips, adminUsers };
  },
  ["admin-commissions-page-data"],
  {
    revalidate: ADMIN_COMMISSIONS_CACHE_SECONDS,
    tags: [ADMIN_COMMISSIONS_CACHE_TAG],
  }
);

export default async function ComisionesPage() {
  const admin = await getAdminFromCookies();
  if (!admin) {
    redirect("/admin/login");
  }
  if (admin.role === "admin") {
    redirect("/admin/contratos");
  }

  const { contracts, trips, adminUsers } = await getCachedComisionesData();
  const adminOptions = adminUsers
    .map((user) => ({
      value: user.username || user.email,
      label: user.username || user.email,
    }))
    .filter((option) => option.value);

  return (
    <AnalysisDashboard
      contracts={contracts as AnalysisContract[]}
      trips={trips as AnalysisTrip[]}
      adminOptions={adminOptions}
    />
  );
}
