import { SignJWT, jwtVerify } from "jose";

import { ADMIN_COOKIE_MAX_AGE } from "@/lib/auth/constants";

const secret = process.env.ADMIN_JWT_SECRET;

if (!secret) {
  throw new Error("ADMIN_JWT_SECRET is not set.");
}

const secretKey = new TextEncoder().encode(secret);

type AdminRole = "owner" | "admin";

export type AdminTokenPayload = {
  sub: string;
  email: string;
  role: AdminRole;
};

export async function signAdminToken(payload: AdminTokenPayload) {
  return new SignJWT({
    email: payload.email,
    role: payload.role,
    type: "admin",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(ADMIN_COOKIE_MAX_AGE)
    .sign(secretKey);
}

export async function verifyAdminToken(token: string): Promise<AdminTokenPayload> {
  const { payload } = await jwtVerify(token, secretKey);

  if (payload.type !== "admin") {
    throw new Error("Invalid token type.");
  }

  const sub = payload.sub;
  const email = payload.email;
  const role = payload.role;

  if (typeof sub !== "string" || typeof email !== "string") {
    throw new Error("Invalid token payload.");
  }

  if (role !== "owner" && role !== "admin") {
    throw new Error("Invalid role.");
  }

  return { sub, email, role };
}
