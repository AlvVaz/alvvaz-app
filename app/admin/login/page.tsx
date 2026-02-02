import { redirect } from "next/navigation";

import { AdminLoginForm } from "@/app/admin/login/AdminLoginForm";
import { getAdminFromCookies } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";

export default async function AdminLoginPage() {
  const admin = await getAdminFromCookies();
  if (admin) {
    redirect("/admin");
  }

  let hasUsers = false;
  let serverError = "";

  try {
    hasUsers = (await prisma.adminUser.count()) > 0;
  } catch (error) {
    console.error("Admin login check failed:", error);
    serverError = "No se pudo conectar a la base de datos.";
  }

  return <AdminLoginForm hasUsers={hasUsers} serverError={serverError} />;
}
