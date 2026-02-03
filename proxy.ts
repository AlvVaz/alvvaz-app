import { NextResponse, type NextRequest } from "next/server";

import { ADMIN_COOKIE_NAME } from "@/lib/auth/constants";
import { verifyAdminToken } from "@/lib/auth/jwt";

const ADMIN_LOGIN_PATH = "/admin/login";
const ADMIN_ALLOWED_ADMIN_ROUTES = ["/admin/contratos", "/admin/magazine"];
const ADMIN_ALLOWED_ADMIN_APIS = ["/api/admin/contracts", "/api/admin/magazine"];

function isAllowedForAdmin(pathname: string) {
  if (pathname === "/admin") return false;
  if (pathname.startsWith("/admin")) {
    return ADMIN_ALLOWED_ADMIN_ROUTES.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`)
    );
  }
  if (pathname.startsWith("/api/admin")) {
    return ADMIN_ALLOWED_ADMIN_APIS.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`)
    );
  }
  return true;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdminApi = pathname.startsWith("/api/admin");
  const isAdminRoute = pathname.startsWith("/admin");

  if (!isAdminApi && !isAdminRoute) {
    return NextResponse.next();
  }

  if (isAdminRoute && pathname.startsWith(ADMIN_LOGIN_PATH)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) {
    if (isAdminApi) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL(ADMIN_LOGIN_PATH, request.url));
  }

  try {
    const admin = await verifyAdminToken(token);
    if (admin.role === "admin" && !isAllowedForAdmin(pathname)) {
      if (isAdminApi) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/admin/contratos", request.url));
    }
    return NextResponse.next();
  } catch {
    if (isAdminApi) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const response = NextResponse.redirect(new URL(ADMIN_LOGIN_PATH, request.url));
    response.cookies.delete(ADMIN_COOKIE_NAME);
    return response;
  }
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
