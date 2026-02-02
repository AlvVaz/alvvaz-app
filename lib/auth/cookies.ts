import { ADMIN_COOKIE_MAX_AGE, ADMIN_COOKIE_NAME } from "@/lib/auth/constants";

export const adminCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: ADMIN_COOKIE_MAX_AGE,
};

export { ADMIN_COOKIE_NAME };
