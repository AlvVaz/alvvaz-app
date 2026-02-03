import { NextResponse } from "next/server";

import { ADMIN_COOKIE_NAME } from "@/lib/auth/cookies";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/", request.url), 303);
  response.cookies.delete(ADMIN_COOKIE_NAME);
  return response;
}
