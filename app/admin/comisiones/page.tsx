import { redirect } from "next/navigation";

import { getAdminFromCookies } from "@/lib/auth/admin";
import { getContracts, getTrips } from "@/lib/db";
import { prisma } from "@/lib/prisma";

import { AnalysisDashboard } from "./AnalysisDashboard";

export const dynamic = "force-dynamic";

export default async function ComisionesPage() {
  const admin = await getAdminFromCookies();
  if (!admin) {
    redirect("/admin/login");
  }
  if (admin.role === "admin") {
    redirect("/admin/contratos");
  }

  const contracts = await getContracts();
  const trips = await getTrips();
  const adminUsers = await prisma.adminUser.findMany({
    where: { role: { in: ["admin", "owner"] } },
    orderBy: [{ username: "asc" }, { email: "asc" }],
  });
  const adminOptions = adminUsers
    .map((user) => ({
      value: user.username || user.email,
      label: user.username || user.email,
    }))
    .filter((option) => option.value);

  return (
    <AnalysisDashboard contracts={contracts} trips={trips} adminOptions={adminOptions} />
  );
}
