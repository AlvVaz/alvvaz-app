import { redirect } from "next/navigation";

import { getAdminFromCookies } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";

import {
  AnalysisDashboard,
  type AnalysisContract,
  type AnalysisTrip,
} from "./AnalysisDashboard";

export const dynamic = "force-dynamic";

export default async function ComisionesPage() {
  const admin = await getAdminFromCookies();
  if (!admin) {
    redirect("/admin/login");
  }
  if (admin.role === "admin") {
    redirect("/admin/contratos");
  }

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
      orderBy: [{ username: "asc" }, { email: "asc" }],
    }),
  ]);
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
