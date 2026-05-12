import Link from "next/link";
import { redirect } from "next/navigation";

import { SectionHeading } from "@/components/section-heading";
import { buttonLinkStyles } from "@/components/ui/button";
import { getAdminFromCookies } from "@/lib/auth/admin";

export default async function AdminPage() {
  const admin = await getAdminFromCookies();
  if (!admin) {
    redirect("/admin/login");
  }
  redirect("/admin/clients");
}
