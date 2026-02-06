import { redirect } from "next/navigation";

import { getAdminFromCookies } from "@/lib/auth/admin";
import { getContracts, getTrips } from "@/lib/db";

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

  return <AnalysisDashboard contracts={contracts} trips={trips} />;
}
