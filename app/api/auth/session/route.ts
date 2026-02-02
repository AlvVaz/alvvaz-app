import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { ADMIN_COOKIE_NAME } from "@/lib/auth/constants";
import { verifyAdminToken } from "@/lib/auth/jwt";

export const runtime = "nodejs";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  try {
    const admin = await verifyAdminToken(token);
    return NextResponse.json({ ok: true, role: admin.role, email: admin.email });
  } catch {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
}
