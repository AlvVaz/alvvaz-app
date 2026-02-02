import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { ADMIN_COOKIE_NAME } from "@/lib/auth/constants";
import { verifyAdminToken } from "@/lib/auth/jwt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json(
      { ok: false, reason: "missing_cookie" },
      { status: 401 }
    );
  }

  try {
    const admin = await verifyAdminToken(token);
    const response = NextResponse.json({
      ok: true,
      role: admin.role,
      email: admin.email,
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch {
    return NextResponse.json(
      { ok: false, reason: "invalid_cookie" },
      { status: 401 }
    );
  }
}
