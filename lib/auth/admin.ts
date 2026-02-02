import { cookies } from "next/headers";

import { ADMIN_COOKIE_NAME } from "@/lib/auth/constants";
import { verifyAdminToken } from "@/lib/auth/jwt";

export async function getAdminFromCookies() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  try {
    return await verifyAdminToken(token);
  } catch {
    return null;
  }
}
